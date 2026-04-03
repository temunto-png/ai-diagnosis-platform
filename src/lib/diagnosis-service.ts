import type { AppConfig } from "../configs/index";
import { applyMonetization } from "./monetization";
import { resolveMaxTokens } from "./claude";

const MAX_CONTEXT_KEYS = 10;
const MAX_CONTEXT_VALUE_LEN = 100;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export type RateLimitNamespace = {
  getByName(name: string): {
    fetch(request: Request): Promise<Response>;
  };
};

export type DiagnosisEnvironment = {
  ANTHROPIC_API_KEY: string;
  AMAZON_ASSOCIATE_ID: string;
  RAKUTEN_AFFILIATE_ID: string;
  RATE_LIMITER?: RateLimitNamespace;
  DIAGNOSIS_CACHE_KV?: KVNamespace;
  CLAUDE_DIAGNOSIS_MAX_TOKENS?: string;
  DIAGNOSIS_CACHE_TTL_SECONDS?: string;
  MAX_IMAGE_BASE64_LENGTH?: string;
  EXPECTED_ORIGIN?: string;
};

export type ClaudeCaller = (
  apiKey: string,
  imageBase64: string,
  prompt: string,
  maxRetries?: number,
  maxTokens?: number
) => Promise<Record<string, unknown>>;

export type RateLimiter = (
  ip: string,
  limit: number,
  namespace?: RateLimitNamespace | null
) => Promise<boolean>;

export type DiagnosisDependencies = {
  callClaude: ClaudeCaller;
  isRateLimited: RateLimiter;
};

export function resolveAllowedOrigins(env: DiagnosisEnvironment): string[] {
  const origins = [env.EXPECTED_ORIGIN ?? "https://satsu-tei.com", "http://localhost:4321"];
  return Array.from(new Set(origins));
}

export function buildCorsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function validateRequestOrigin(
  request: Request,
  allowedOrigins: string[],
  corsHeaders: HeadersInit
): Response | null {
  const origin = request.headers.get("Origin");
  const secFetchSite = request.headers.get("Sec-Fetch-Site");

  if (!origin || !allowedOrigins.includes(origin)) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
  }

  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "same-site") {
    return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
  }

  return null;
}

export function resolveCorsHeaders(request: Request, allowedOrigins: string[]): HeadersInit {
  const requestOrigin = request.headers.get("Origin");
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] ?? "https://satsu-tei.com";
  return buildCorsHeaders(origin);
}

function deriveAllowedContextKeys(config: AppConfig): string[] {
  if (config.allowed_context_keys && config.allowed_context_keys.length > 0) {
    return config.allowed_context_keys;
  }

  const matches = config.prompt.match(/\{\{(\w+)\}\}/g) ?? [];
  return Array.from(new Set(matches.map((match) => match.slice(2, -2))));
}

function normalizeContextValue(value: string): string {
  return JSON.stringify(value.slice(0, MAX_CONTEXT_VALUE_LEN));
}

export function sanitizeContext(raw: unknown, config: AppConfig): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const allowed = new Set(deriveAllowedContextKeys(config));
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([key, value]) => allowed.has(key) && typeof value === "string")
      .slice(0, MAX_CONTEXT_KEYS)
      .map(([key, value]) => [key, normalizeContextValue(value as string)])
  );
}

export function interpolatePrompt(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => context[key] ?? "\"\"");
}

export async function buildServerCacheKey(
  appId: string,
  image: string,
  context: Record<string, string>
): Promise<string> {
  const input = JSON.stringify({
    appId,
    image,
    context: Object.fromEntries(Object.entries(context).sort(([a], [b]) => a.localeCompare(b))),
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function resolveClientImageHash(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return HASH_PATTERN.test(raw) ? raw : null;
}

export type AnalyzeInput = {
  image: string;
  imageHash: string | null;
  context: Record<string, string>;
};

export function parseAnalyzeBody(
  body: { image?: unknown; imageHash?: unknown; context?: unknown },
  config: AppConfig
): AnalyzeInput {
  if (typeof body.image !== "string" || body.image.length === 0) {
    throw new Error("image field is required");
  }

  return {
    image: body.image,
    imageHash: resolveClientImageHash(body.imageHash),
    context: sanitizeContext(body.context, config),
  };
}

export function validateImageSize(image: string, env: DiagnosisEnvironment): string | null {
  const maxImageLen = parseInt(env.MAX_IMAGE_BASE64_LENGTH ?? "1500000", 10);
  if (image.length > maxImageLen) {
    return "Image payload too large";
  }
  return null;
}

export async function readCachedDiagnosis(
  cache: KVNamespace | undefined,
  cacheKey: string | null
): Promise<Record<string, unknown> | null> {
  if (!cache || !cacheKey) return null;

  try {
    const cached = await cache.get(cacheKey);
    return cached ? (JSON.parse(cached) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function buildClientCacheKey(appId: string, imageHash: string, context: Record<string, string>): string {
  const contextKey = JSON.stringify(
    Object.fromEntries(Object.entries(context).sort(([a], [b]) => a.localeCompare(b)))
  );
  return `result:${appId}:${imageHash}:${contextKey}`;
}

export async function persistCachedDiagnosis(
  cache: KVNamespace | undefined,
  cacheKey: string | null,
  payload: Record<string, unknown>,
  env: DiagnosisEnvironment
): Promise<void> {
  if (!cache || !cacheKey) return;

  const ttl = parseInt(env.DIAGNOSIS_CACHE_TTL_SECONDS ?? "86400", 10);
  await cache.put(cacheKey, JSON.stringify(payload), { expirationTtl: ttl });
}

export async function runDiagnosis(
  input: AnalyzeInput,
  config: AppConfig,
  env: DiagnosisEnvironment,
  deps: DiagnosisDependencies
): Promise<Record<string, unknown>> {
  const prompt = interpolatePrompt(config.prompt, input.context);
  const maxTokens = resolveMaxTokens(env.CLAUDE_DIAGNOSIS_MAX_TOKENS);
  const diagnosisResult = await deps.callClaude(env.ANTHROPIC_API_KEY, input.image, prompt, 3, maxTokens);

  return applyMonetization(
    diagnosisResult,
    config.monetization,
    input.context,
    { amazonId: env.AMAZON_ASSOCIATE_ID, rakutenId: env.RAKUTEN_AFFILIATE_ID }
  );
}
