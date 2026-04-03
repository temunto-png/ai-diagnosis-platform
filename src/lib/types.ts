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

/** Claude API から返される診断結果の共通スキーマ（全フィールドはオプショナル） */
export type DiagnosisData = {
  // DIY補修診断
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
