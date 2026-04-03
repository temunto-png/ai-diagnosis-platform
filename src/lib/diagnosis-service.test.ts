import { describe, expect, it } from "vitest";
import type { AppConfig } from "../configs/index";
import {
  buildServerCacheKey,
  buildClientCacheKey,
  buildCorsHeaders,
  executeDiagnosisRequest,
  interpolatePrompt,
  parseAnalyzeBody,
  resolveClientIp,
  resolveAllowedOrigins,
  resolveCorsHeaders,
  runDiagnosis,
  sanitizeContext,
  validateContentLength,
  validateRequestOrigin,
} from "./diagnosis-service";

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

  it("interpolates prompt with safe encoded values", () => {
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

  it("parses image and normalized image hash from body", () => {
    const input = parseAnalyzeBody(
      {
        image: "abc",
        imageHash: "a".repeat(64),
        context: { surface: "wall", ignored: "x" },
      },
      config
    );

    expect(input.imageHash).toBe("a".repeat(64));
    expect(input.context).toEqual({ surface: "wall" });
  });

  it("builds stable client cache keys from app, hash and context", () => {
    const key = buildClientCacheKey("app", "b".repeat(64), { surface: "wall" });
    expect(key).toContain("app");
    expect(key).toContain("b".repeat(64));
  });

  it("echoes allowed request origin in CORS headers", () => {
    const headers = resolveCorsHeaders(
      new Request("https://example.com", { headers: { Origin: "http://localhost:4321" } }),
      ["https://satsu-tei.com", "http://localhost:4321"]
    ) as Record<string, string>;
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:4321");
  });

  it("resolves client IP from trusted headers", () => {
    const request = new Request("https://example.com/api/test", {
      headers: { "CF-Connecting-IP": "203.0.113.10" },
    });

    expect(resolveClientIp(request)).toBe("203.0.113.10");
  });

  it("ignores spoofable proxy headers when Cloudflare IP header is absent", () => {
    const request = new Request("https://example.com/api/test", {
      headers: { "X-Forwarded-For": "203.0.113.10, 10.0.0.1" },
    });

    expect(resolveClientIp(request)).toBeNull();
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

  it("returns 503 when a trusted client IP is unavailable", async () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: {
        Origin: "https://satsu-tei.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: "abc", imageHash: "a".repeat(64) }),
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

  it("uses client image hash to build stable server cache keys", async () => {
    const fromHash = await buildServerCacheKey("app", "a".repeat(64), "image-one", { surface: "wall" });
    const fromOtherImage = await buildServerCacheKey("app", "a".repeat(64), "image-two", { surface: "wall" });

    expect(fromHash).toBe(fromOtherImage);
  });

  it("normalizes Claude output before monetization", async () => {
    const result = await runDiagnosis(
      {
        image: "abc",
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
