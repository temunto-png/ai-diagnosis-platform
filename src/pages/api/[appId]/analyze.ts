import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getConfig } from "../../../configs/index";
import { callClaude, resolveMaxTokens } from "../../../lib/claude";
import { applyMonetization } from "../../../lib/monetization";
import { isRateLimited } from "../../../lib/rate-limit";

async function buildCacheKey(appId: string, image: string, context: Record<string, string>): Promise<string> {
  const input = JSON.stringify({ appId, image, context: Object.fromEntries(Object.entries(context).sort()) });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://satsu-tei.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS: APIRoute = () =>
  new Response(null, { headers: corsHeaders });

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const appId = params.appId!;

    const config = getConfig(appId);
    if (!config) {
      return Response.json({ error: "App not found" }, { status: 404, headers: corsHeaders });
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    try {
      if (await isRateLimited(ip, config.daily_limit, env.RATE_LIMIT_KV)) {
        return Response.json(
          { error: "Rate limit exceeded. Please try again tomorrow." },
          { status: 429, headers: corsHeaders }
        );
      }
    } catch {
      // KV エラー時はレート制限をスキップして続行
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

    // 画像サイズ上限チェック（デフォルト ~1.5MB base64）
    const maxImageLen = parseInt(env.MAX_IMAGE_BASE64_LENGTH ?? "1500000", 10);
    if (image.length > maxImageLen) {
      return Response.json({ error: "Image payload too large" }, { status: 413, headers: corsHeaders });
    }

    const prompt = config.prompt.replace(
      /\{\{(\w+)\}\}/g,
      (_: string, key: string) => context[key] ?? ""
    );

    // サーバーサイドキャッシュ確認（KV バインド時のみ）
    let cacheKey: string | null = null;
    if (env.DIAGNOSIS_CACHE_KV) {
      try {
        cacheKey = await buildCacheKey(appId, image, context);
        const cached = await env.DIAGNOSIS_CACHE_KV.get(cacheKey);
        if (cached) {
          return Response.json(JSON.parse(cached), { headers: corsHeaders });
        }
      } catch {
        // キャッシュ失敗時は通常フローへ
      }
    }

    const maxTokens = resolveMaxTokens(env.CLAUDE_DIAGNOSIS_MAX_TOKENS);

    let diagnosisResult: Record<string, unknown>;
    try {
      diagnosisResult = await callClaude(env.ANTHROPIC_API_KEY, image, prompt, 3, maxTokens);
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

    // キャッシュ書き込み（失敗しても続行）
    if (env.DIAGNOSIS_CACHE_KV && cacheKey) {
      const ttl = parseInt(env.DIAGNOSIS_CACHE_TTL_SECONDS ?? "86400", 10);
      env.DIAGNOSIS_CACHE_KV.put(cacheKey, JSON.stringify(enriched), { expirationTtl: ttl }).catch(() => {});
    }

    return Response.json(enriched, { headers: corsHeaders });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
};
