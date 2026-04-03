import type { AppConfig } from "../configs/index";
import { applyMonetization } from "./monetization";
import { resolveMaxTokens } from "./claude";
import { normalizeDiagnosisData } from "./types";

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

export type DiagnosisExecutionResult =
  | { ok: true; payload: Record<string, unknown>; cacheKey: string | null }
  | {
      ok: false;
      status: 400 | 413 | 429 | 503;
      payload: { error: string; requestId?: string };
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
  return value.trim().slice(0, MAX_CONTEXT_VALUE_LEN);
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
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_match: string, key: string) => JSON.stringify(context[key] ?? "")
  );
}

export async function buildServerCacheKey(
  appId: string,
  image: string,
  context: Record<string, string>
): Promise<string> {
  const imageBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(image));
  const imageDigest = Array.from(new Uint8Array(imageBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const input = JSON.stringify({
    appId,
    imageDigest,
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

export function validateContentLength(request: Request, env: DiagnosisEnvironment): string | null {
  const rawContentLength = request.headers.get("Content-Length");
  if (!rawContentLength) return null;

  const contentLength = Number(rawContentLength);
  if (!Number.isFinite(contentLength) || contentLength <= 0) return null;

  const maxImageLen = parseInt(env.MAX_IMAGE_BASE64_LENGTH ?? "1500000", 10);
  const maxJsonLen = Math.ceil(maxImageLen * 1.2);
  if (contentLength > maxJsonLen) {
    return "Request body too large";
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

export function resolveClientIp(request: Request): string | null {
  const cfIp = request.headers.get("CF-Connecting-IP");
  return cfIp?.trim() || null;
}

export async function runDiagnosis(
  input: AnalyzeInput,
  config: AppConfig,
  env: DiagnosisEnvironment,
  deps: DiagnosisDependencies
): Promise<Record<string, unknown>> {
  const prompt = interpolatePrompt(config.prompt, input.context);
  const maxTokens = resolveMaxTokens(env.CLAUDE_DIAGNOSIS_MAX_TOKENS);
  const diagnosisResult = normalizeDiagnosisData(
    await deps.callClaude(env.ANTHROPIC_API_KEY, input.image, prompt, 3, maxTokens)
  );

  return applyMonetization(
    diagnosisResult,
    config.monetization,
    input.context,
    { amazonId: env.AMAZON_ASSOCIATE_ID, rakutenId: env.RAKUTEN_AFFILIATE_ID }
  );
}

export async function executeDiagnosisRequest(
  request: Request,
  appId: string,
  config: AppConfig,
  env: DiagnosisEnvironment,
  deps: DiagnosisDependencies,
  requestId: string
): Promise<DiagnosisExecutionResult> {
  const ip = resolveClientIp(request);
  if (!ip) {
    console.error(`[${requestId}] Unable to determine client IP appId=${appId}`);
    return {
      ok: false,
      status: 503,
      payload: { error: "Diagnosis service temporarily unavailable", requestId },
    };
  }

  try {
    if (await deps.isRateLimited(ip, config.daily_limit, env.RATE_LIMITER ?? null)) {
      return {
        ok: false,
        status: 429,
        payload: { error: "Rate limit exceeded. Please try again tomorrow." },
      };
    }
  } catch (error) {
    console.error(
      `[${requestId}] Rate limit check failed appId=${appId}:`,
      error instanceof Error ? error.message : error
    );
    return {
      ok: false,
      status: 503,
      payload: { error: "Diagnosis service temporarily unavailable", requestId },
    };
  }

  const contentLengthError = validateContentLength(request, env);
  if (contentLengthError) {
    return {
      ok: false,
      status: 413,
      payload: { error: contentLengthError },
    };
  }

  let rawBody: { image?: unknown; imageHash?: unknown; context?: unknown };
  try {
    rawBody = await request.json();
  } catch {
    return {
      ok: false,
      status: 400,
      payload: { error: "Invalid JSON body" },
    };
  }

  let input: AnalyzeInput;
  try {
    input = parseAnalyzeBody(rawBody, config);
  } catch (error) {
    return {
      ok: false,
      status: 400,
      payload: { error: error instanceof Error ? error.message : "Invalid request body" },
    };
  }

  const imageSizeError = validateImageSize(input.image, env);
  if (imageSizeError) {
    return {
      ok: false,
      status: 413,
      payload: { error: imageSizeError },
    };
  }

  let cacheKey: string | null = null;
  if (env.DIAGNOSIS_CACHE_KV) {
    try {
      cacheKey = await buildServerCacheKey(appId, input.image, input.context);
      const cached = await readCachedDiagnosis(env.DIAGNOSIS_CACHE_KV, cacheKey);
      if (cached) {
        return { ok: true, payload: cached, cacheKey };
      }
    } catch {
      cacheKey = null;
    }
  }

  try {
    const enriched = await runDiagnosis(input, config, env, deps);
    return { ok: true, payload: enriched, cacheKey };
  } catch (error) {
    console.error(
      `[${requestId}] Claude API error appId=${appId}:`,
      error instanceof Error ? error.message : error
    );
    return {
      ok: false,
      status: 503,
      payload: { error: "Diagnosis service temporarily unavailable", requestId },
    };
  }
}
