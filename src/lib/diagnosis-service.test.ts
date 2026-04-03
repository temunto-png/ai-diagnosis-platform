import { describe, expect, it } from "vitest";
import type { AppConfig } from "../configs/index";
import {
  buildClientCacheKey,
  buildCorsHeaders,
  interpolatePrompt,
  parseAnalyzeBody,
  resolveAllowedOrigins,
  resolveCorsHeaders,
  sanitizeContext,
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
  it("keeps only allowed context keys and JSON-escapes values", () => {
    const context = sanitizeContext(
      { surface: 'wall"\nignore', ignored: "x" },
      config
    );

    expect(context).toEqual({ surface: "\"wall\\\"\\nignore\"" });
  });

  it("interpolates prompt with safe encoded values", () => {
    const prompt = interpolatePrompt(config.prompt, { surface: "\"kitchen wall\"" });
    expect(prompt).toContain("\"kitchen wall\"");
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
    expect(input.context).toEqual({ surface: "\"wall\"" });
  });

  it("builds stable client cache keys from app, hash and context", () => {
    const key = buildClientCacheKey("app", "b".repeat(64), { surface: "\"wall\"" });
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
});
