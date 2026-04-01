import type { APIRoute } from "astro";
import { getConfig } from "../../../configs/index";
import { callClaude } from "../../../lib/claude";
import { applyMonetization } from "../../../lib/monetization";
import { isRateLimited } from "../../../lib/rate-limit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://satsu-tei.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS: APIRoute = () =>
  new Response(null, { headers: corsHeaders });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const appId = params.appId!;

  const config = getConfig(appId);
  if (!config) {
    return Response.json({ error: "App not found" }, { status: 404, headers: corsHeaders });
  }

  const env = (locals as App.Locals).runtime.env;

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (await isRateLimited(ip, config.daily_limit, env.RATE_LIMIT_KV)) {
    return Response.json(
      { error: "Rate limit exceeded. Please try again tomorrow." },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: { image: string; context?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  const { image, context = {} } = body;
  if (!image) {
    return Response.json({ error: "image field is required" }, { status: 400, headers: corsHeaders });
  }

  const prompt = config.prompt.replace(
    /\{\{(\w+)\}\}/g,
    (_: string, key: string) => context[key] ?? ""
  );

  let diagnosisResult: Record<string, unknown>;
  try {
    diagnosisResult = await callClaude(env.ANTHROPIC_API_KEY, image, prompt);
  } catch {
    return Response.json(
      { error: "Diagnosis service temporarily unavailable" },
      { status: 503, headers: corsHeaders }
    );
  }

  const enriched = applyMonetization(
    diagnosisResult,
    config.monetization,
    context,
    { amazonId: env.AMAZON_ASSOCIATE_ID, rakutenId: env.RAKUTEN_AFFILIATE_ID }
  );

  return Response.json(enriched, { headers: corsHeaders });
};
