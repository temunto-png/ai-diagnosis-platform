import { describe, expect, it } from "vitest";
import type { AppConfig } from "../configs/index";
import {
  buildDiagnosisCacheVersion,
  buildClientCacheKey,
  buildCorsHeaders,
  buildServerCacheKey,
  executeDiagnosisRequest,
  interpolatePrompt,
  parseAnalyzeBody,
  resolveAllowedOrigins,
  resolveClientIp,
  resolveCorsHeaders,
  readRequestBodyWithLimit,
  runDiagnosis,
  sanitizeContext,
  validateContentLength,
  validateRequestBodySize,
  validateRequestOrigin,
} from "./diagnosis-service";

const VALID_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";

const config: AppConfig = {
  name: "Test",
  description: "Test",
  daily_limit: 5,
  prompt: "Surface: {{surface}}",
  allowed_context_keys: ["surface"],
  monetization: [],
  seo: {
    title: "Test",
    description: "Test",
    keywords: [],
  },
};

describe("diagnosis-service", () => {
  it("keeps only allowed context keys and trims values", () => {
    const context = sanitizeContext(
      { surface: ' wall"\nignore ', ignored: "x" },
      config
    );

    expect(context).toEqual({ surface: 'wall"\nignore' });
  });

  it("interpolates prompt with safely encoded values", () => {
    const prompt = interpolatePrompt(config.prompt, { surface: 'kitchen "wall"' });
    expect(prompt).toContain("\"kitchen \\\"wall\\\"\"");
  });

  it("rejects missing origin", () => {
    const request = new Request("https://example.com/api/test", { method: "POST" });
    const response = validateRequestOrigin(
      request,
      ["https://satsu-tei.com"],
      buildCorsHeaders("https://satsu-tei.com")
    );

    expect(response?.status).toBe(403);
  });

  it("allows configured production and localhost origins", () => {
    expect(resolveAllowedOrigins({
      ANTHROPIC_API_KEY: "x",
      AMAZON_ASSOCIATE_ID: "y",
      RAKUTEN_AFFILIATE_ID: "z",
    })).toEqual(["https://satsu-tei.com", "http://localhost:4321"]);
  });

  it("parses image and normalized image hash from the body", () => {
    const input = parseAnalyzeBody(
      {
        image: VALID_JPEG_BASE64,
        imageHash: "a".repeat(64),
        context: { surface: "wall", ignored: "x" },
      },
      config
    );

    expect(input.imageHash).toBe("a".repeat(64));
    expect(input.context).toEqual({ surface: "wall" });
  });

  it("builds stable client cache keys from app, hash and context", () => {
    const key = buildClientCacheKey("app", "b".repeat(64), { surface: "wall" }, "v2:test");
    expect(key).toContain("app");
    expect(key).toContain("b".repeat(64));
    expect(key).toContain("v2:test");
  });

  it("echoes the allowed request origin in CORS headers", () => {
    const headers = resolveCorsHeaders(
      new Request("https://example.com", { headers: { Origin: "http://localhost:4321" } }),
      ["https://satsu-tei.com", "http://localhost:4321"]
    ) as Record<string, string>;

    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:4321");
  });

  it("resolves the client IP from trusted headers", () => {
    const request = new Request("https://example.com/api/test", {
      headers: { "CF-Connecting-IP": "203.0.113.10" },
    });

    expect(resolveClientIp(request)).toBe("203.0.113.10");
  });

  it("ignores spoofable proxy headers when the Cloudflare IP header is absent", () => {
    const request = new Request("https://example.com/api/test", {
      headers: { "X-Forwarded-For": "203.0.113.10, 10.0.0.1" },
    });

    expect(resolveClientIp(request)).toBeNull();
  });

  it("uses the loopback IP for localhost development requests", () => {
    const request = new Request("http://localhost:4321/api/test");
    expect(resolveClientIp(request)).toBe("127.0.0.1");
  });

  it("rejects oversized request bodies before parsing JSON", () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: { "Content-Length": "1800001" },
    });

    expect(validateContentLength(request, {
      ANTHROPIC_API_KEY: "x",
      AMAZON_ASSOCIATE_ID: "y",
      RAKUTEN_AFFILIATE_ID: "z",
    })).toBe("Request body too large");
  });

  it("rejects oversized request bodies based on the actual body bytes", () => {
    const body = "x".repeat(1_800_001);

    expect(validateRequestBodySize(body, {
      ANTHROPIC_API_KEY: "x",
      AMAZON_ASSOCIATE_ID: "y",
      RAKUTEN_AFFILIATE_ID: "z",
    })).toBe("Request body too large");
  });

  it("returns 503 when a trusted client IP is unavailable", async () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: {
        Origin: "https://satsu-tei.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: VALID_JPEG_BASE64, imageHash: "a".repeat(64) }),
    });

    const result = await executeDiagnosisRequest(
      request,
      "test-app",
      config,
      {
        ANTHROPIC_API_KEY: "key",
        AMAZON_ASSOCIATE_ID: "amazon-22",
        RAKUTEN_AFFILIATE_ID: "rakuten-id",
      },
      {
        callClaude: async () => ({}),
        isRateLimited: async () => false,
      },
      "req-1"
    );

    expect(result).toEqual({
      ok: false,
      status: 503,
      payload: {
        error: "Diagnosis service temporarily unavailable",
        requestId: "req-1",
      },
    });
  });

  it("builds distinct server cache keys for different images", async () => {
    const first = await buildServerCacheKey("app", "image-one", { surface: "wall" }, "v2:test");
    const second = await buildServerCacheKey("app", "image-two", { surface: "wall" }, "v2:test");

    expect(first).not.toBe(second);
  });

  it("changes the cache version when the prompt changes", () => {
    expect(buildDiagnosisCacheVersion("prompt-a")).not.toBe(buildDiagnosisCacheVersion("prompt-b"));
  });

  it("rejects invalid non-jpeg image payloads", () => {
    expect(() =>
      parseAnalyzeBody({ image: "bm90LWEtanBlZw==", imageHash: "a".repeat(64) }, config)
    ).toThrow("image must be a valid JPEG base64 payload");
  });

  it("stops reading request bodies that exceed the byte limit", async () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("12345"));
          controller.enqueue(new TextEncoder().encode("67890"));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readRequestBodyWithLimit(request, 8)).rejects.toThrow("Request body too large");
  });

  it("normalizes Claude output before monetization", async () => {
    const result = await runDiagnosis(
      {
        image: VALID_JPEG_BASE64,
        imageHash: "a".repeat(64),
        context: { surface: "wall" },
      },
      {
        ...config,
        monetization: [{ condition: "default", type: "affiliate", keyword: "{{products[0].amazon_keyword}}" }],
      },
      {
        ANTHROPIC_API_KEY: "key",
        AMAZON_ASSOCIATE_ID: "amazon-22",
        RAKUTEN_AFFILIATE_ID: "rakuten-id",
      },
      {
        callClaude: async () => ({
          damage_type: " scratch ",
          products: [
            {
              category: " filler ",
              amazon_keyword: " repair filler ",
              reason: " smooths the damage ",
              priority: 1.8,
            },
            "invalid",
          ],
          unexpected: "<ignored>",
        }),
        isRateLimited: async () => false,
      }
    );

    expect(result).toMatchObject({
      damage_type: "scratch",
      products: [
        {
          category: "filler",
          amazon_keyword: "repair filler",
          reason: "smooths the damage",
          priority: 1,
        },
      ],
    });
    expect("unexpected" in result).toBe(false);
  });
});
