import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getConfig } from "../../../configs/index";
import { callClaude } from "../../../lib/claude";
import {
  buildCorsHeaders,
  buildServerCacheKey,
  parseAnalyzeBody,
  persistCachedDiagnosis,
  readCachedDiagnosis,
  resolveClientIp,
  resolveAllowedOrigins,
  resolveCorsHeaders,
  runDiagnosis,
  validateImageSize,
  validateRequestOrigin,
  type DiagnosisDependencies,
  type DiagnosisEnvironment,
} from "../../../lib/diagnosis-service";
import { isRateLimited } from "../../../lib/rate-limit";

const dependencies: DiagnosisDependencies = {
  callClaude,
  isRateLimited,
};

function serviceUnavailable(requestId: string, corsHeaders: HeadersInit): Response {
  return Response.json(
    { error: "Diagnosis service temporarily unavailable", requestId },
    { status: 503, headers: corsHeaders }
  );
}

export function createAnalyzeRoute(
  runtimeEnv: DiagnosisEnvironment,
  deps: DiagnosisDependencies = dependencies
): APIRoute {
  const allowedOrigins = resolveAllowedOrigins(runtimeEnv);

  return async ({ params, request }) => {
    const requestId = crypto.randomUUID();
    const corsHeaders = resolveCorsHeaders(request, allowedOrigins);

    try {
      const forbidden = validateRequestOrigin(request, allowedOrigins, corsHeaders);
      if (forbidden) return forbidden;

      const appId = params.appId;
      if (!appId) {
        return Response.json({ error: "App not found" }, { status: 404, headers: corsHeaders });
      }

      const config = getConfig(appId);
      if (!config) {
        return Response.json({ error: "App not found" }, { status: 404, headers: corsHeaders });
      }

      const ip = resolveClientIp(request);
      if (!ip) {
        console.error(`[${requestId}] Unable to determine client IP appId=${appId}`);
        return serviceUnavailable(requestId, corsHeaders);
      }

      try {
        if (await deps.isRateLimited(ip, config.daily_limit, runtimeEnv.RATE_LIMITER ?? null)) {
          return Response.json(
            { error: "Rate limit exceeded. Please try again tomorrow." },
            { status: 429, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error(
          `[${requestId}] Rate limit check failed appId=${appId}:`,
          error instanceof Error ? error.message : error
        );
        return serviceUnavailable(requestId, corsHeaders);
      }

      let rawBody: { image?: unknown; imageHash?: unknown; context?: unknown };
      try {
        rawBody = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
      }

      let input;
      try {
        input = parseAnalyzeBody(rawBody, config);
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : "Invalid request body" },
          { status: 400, headers: corsHeaders }
        );
      }

      const imageSizeError = validateImageSize(input.image, runtimeEnv);
      if (imageSizeError) {
        return Response.json({ error: imageSizeError }, { status: 413, headers: corsHeaders });
      }

      let cacheKey: string | null = null;
      if (runtimeEnv.DIAGNOSIS_CACHE_KV) {
        try {
          cacheKey = await buildServerCacheKey(appId, input.image, input.context);
          const cached = await readCachedDiagnosis(runtimeEnv.DIAGNOSIS_CACHE_KV, cacheKey);
          if (cached) {
            return Response.json(cached, { headers: corsHeaders });
          }
        } catch {
          cacheKey = null;
        }
      }

      let enriched: Record<string, unknown>;
      try {
        enriched = await runDiagnosis(input, config, runtimeEnv, deps);
      } catch (error) {
        console.error(
          `[${requestId}] Claude API error appId=${appId}:`,
          error instanceof Error ? error.message : error
        );
        return serviceUnavailable(requestId, corsHeaders);
      }

      persistCachedDiagnosis(runtimeEnv.DIAGNOSIS_CACHE_KV, cacheKey, enriched, runtimeEnv).catch(() => {});
      return Response.json(enriched, { headers: corsHeaders });
    } catch (error) {
      console.error(`[${requestId}] Unhandled error:`, error instanceof Error ? error.message : error);
      return Response.json(
        { error: "Internal server error", requestId },
        { status: 500, headers: corsHeaders }
      );
    }
  };
}

const allowedOrigins = resolveAllowedOrigins(env);
const defaultCorsHeaders = buildCorsHeaders(allowedOrigins[0] ?? "https://satsu-tei.com");

export const OPTIONS: APIRoute = ({ request }) =>
  new Response(null, { headers: resolveCorsHeaders(request, allowedOrigins) ?? defaultCorsHeaders });
export const POST: APIRoute = createAnalyzeRoute(env, dependencies);
