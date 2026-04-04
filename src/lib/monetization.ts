import type { MonetizationRule } from "../configs/index";
import type { MonetizationResult } from "./types";

const MAX_CPA_URL_LENGTH = 2048;

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  return parts.reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function sanitizeCpaUrl(raw?: string): string | null {
  if (!raw) return null;

  const normalized = raw.trim();
  if (!normalized || normalized.length > MAX_CPA_URL_LENGTH) return null;

  try {
    const url = new URL(normalized);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function applyMonetization(
  result: Record<string, unknown>,
  rules: MonetizationRule[],
  context: Record<string, string>,
  ids: { amazonId: string; rakutenId: string },
  cpaUrl?: string
): Record<string, unknown> & { monetization?: MonetizationResult } {
  const rule = rules.find((candidate) => {
    if (candidate.condition === "default") return true;

    const [field, , rawValue] = candidate.condition.split(" ");
    if (!field || !rawValue) return false;

    const value = rawValue.replace(/'/g, "");
    if (String(result[field] ?? "") !== value) return false;

    // CPA ルールは URL が解決できる場合のみマッチ
    if (candidate.type === "cpa") {
      const resolvedCpaUrl = sanitizeCpaUrl(cpaUrl) ?? sanitizeCpaUrl(candidate.cpa_url);
      if (!resolvedCpaUrl) return false;
    }

    return true;
  });

  if (!rule) return result;

  const merged = { ...result, ...context };
  const keyword = (rule.keyword ?? "").replace(
    /\{\{([^}]+)\}\}/g,
    (_: string, path: string) => String(resolvePath(merged, path.trim()) ?? "")
  );

  const monetization: MonetizationResult = {
    type: rule.type,
    amazon_url:
      rule.type === "affiliate" && keyword
        ? `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${ids.amazonId}`
        : null,
    rakuten_url:
      rule.type === "affiliate" && keyword
        ? `https://hb.afl.rakuten.co.jp/hgc/${ids.rakutenId}/?pc=https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`
        : null,
    cpa_url: rule.type === "cpa" ? (sanitizeCpaUrl(cpaUrl) ?? sanitizeCpaUrl(rule.cpa_url)) : null,
  };

  return { ...result, monetization };
}
