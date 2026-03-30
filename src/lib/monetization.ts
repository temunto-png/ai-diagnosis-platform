import type { MonetizationRule } from "../configs/index";

type MonetizationResult = {
  type: "affiliate" | "cpa" | "adsense";
  amazon_url: string | null;
  rakuten_url: string | null;
  cpa_url: string | null;
};

export function applyMonetization(
  result: Record<string, unknown>,
  rules: MonetizationRule[],
  context: Record<string, string>,
  ids: { amazonId: string; rakutenId: string }
): Record<string, unknown> & { monetization?: MonetizationResult } {
  const rule = rules.find((r) => {
    if (r.condition === "default") return true;
    const [field, , rawValue] = r.condition.split(" ");
    const value = rawValue.replace(/'/g, "");
    return String(result[field] ?? "") === value;
  });

  if (!rule) return result;

  const keyword = (rule.keyword ?? "").replace(
    /\{\{(\w+)\}\}/g,
    (_: string, k: string) => String(result[k] ?? context[k] ?? "")
  );

  const monetization: MonetizationResult = {
    type: rule.type,
    amazon_url:
      rule.type === "affiliate"
        ? `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${ids.amazonId}`
        : null,
    rakuten_url:
      rule.type === "affiliate"
        ? `https://hb.afl.rakuten.co.jp/hgc/${ids.rakutenId}/?pc=https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`
        : null,
    cpa_url: rule.cpa_url ?? null,
  };

  return { ...result, monetization };
}
