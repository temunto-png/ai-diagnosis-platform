import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getConfig } from "../../../configs/index";
import { callClaude } from "../../../lib/claude";
import {
  buildCorsHeaders,
  executeDiagnosisRequest,
  persistCachedDiagnosis,
  resolveAllowedOrigins,
  resolveCorsHeaders,
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
    {
      error: "診断サービスが混み合っています。しばらくしてから再度お試しください。",
      requestId,
    },
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

      const result = await executeDiagnosisRequest(request, appId, config, runtimeEnv, deps, requestId);
      if (!result.ok) {
        if (result.status === 503) {
          return serviceUnavailable(requestId, corsHeaders);
        }
        return Response.json(result.payload, { status: result.status, headers: corsHeaders });
      }

      try {
        await persistCachedDiagnosis(runtimeEnv.DIAGNOSIS_CACHE_KV, result.cacheKey, result.payload, runtimeEnv);
      } catch (error) {
        console.error(
          `[${requestId}] Failed to persist diagnosis cache:`,
          error instanceof Error ? error.message : error
        );
      }
      return Response.json(result.payload, { headers: corsHeaders });
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
