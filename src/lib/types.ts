export type MonetizationResult = {
  type: "affiliate" | "cpa" | "adsense";
  amazon_url: string | null;
  rakuten_url: string | null;
  cpa_url: string | null;
};

export type ProductItem = {
  category: string;
  amazon_keyword: string;
  reason: string;
  priority: number;
};

/** Claude API から返される診断結果の共通フィールド定義 */
export type DiagnosisData = {
  // DIY 修理診断
  damage_type?: string;
  damage_level?: string;
  color_description?: string;
  diy_tip?: string;
  // カビ診断
  mold_type?: string;
  severity?: string;
  location?: string;
  prevention_tip?: string;
  // 共通
  products?: ProductItem[];
  monetization?: MonetizationResult;
};

const MAX_SHORT_TEXT_LEN = 100;
const MAX_MEDIUM_TEXT_LEN = 200;
const MAX_LONG_TEXT_LEN = 500;
const MAX_PRODUCTS = 5;

function trimString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeProductItem(value: unknown): ProductItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const item = value as Record<string, unknown>;
  const category = trimString(item.category, MAX_SHORT_TEXT_LEN);
  const amazonKeyword = trimString(item.amazon_keyword, MAX_SHORT_TEXT_LEN);
  const reason = trimString(item.reason, MAX_MEDIUM_TEXT_LEN);
  const priorityRaw = item.priority;
  const priority =
    typeof priorityRaw === "number" && Number.isFinite(priorityRaw)
      ? Math.max(0, Math.trunc(priorityRaw))
      : 0;

  if (!category || !amazonKeyword || !reason) return null;

  return {
    category,
    amazon_keyword: amazonKeyword,
    reason,
    priority,
  };
}

function normalizeUrl(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeMonetization(value: unknown): MonetizationResult | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const raw = value as Record<string, unknown>;
  const type = raw.type;
  if (type !== "affiliate" && type !== "cpa" && type !== "adsense") {
    return undefined;
  }

  return {
    type,
    amazon_url: normalizeUrl(raw.amazon_url),
    rakuten_url: normalizeUrl(raw.rakuten_url),
    cpa_url: normalizeUrl(raw.cpa_url),
  };
}

export function normalizeDiagnosisData(input: unknown): DiagnosisData {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid diagnosis payload");
  }

  const raw = input as Record<string, unknown>;
  const products = Array.isArray(raw.products)
    ? raw.products
        .map((product) => normalizeProductItem(product))
        .filter((product): product is ProductItem => product !== null)
        .slice(0, MAX_PRODUCTS)
    : undefined;

  return {
    damage_type: trimString(raw.damage_type, MAX_SHORT_TEXT_LEN),
    damage_level: trimString(raw.damage_level, 50),
    color_description: trimString(raw.color_description, MAX_MEDIUM_TEXT_LEN),
    diy_tip: trimString(raw.diy_tip, MAX_LONG_TEXT_LEN),
    mold_type: trimString(raw.mold_type, MAX_SHORT_TEXT_LEN),
    severity: trimString(raw.severity, 50),
    location: trimString(raw.location, MAX_SHORT_TEXT_LEN),
    prevention_tip: trimString(raw.prevention_tip, MAX_LONG_TEXT_LEN),
    products: products && products.length > 0 ? products : undefined,
    monetization: normalizeMonetization(raw.monetization),
  };
}
