import { describe, expect, it } from "vitest";
import { applyMonetization } from "./monetization";
import type { MonetizationRule } from "../configs/index";
import type { MonetizationResult } from "./types";

const ids = { amazonId: "testsite-22", rakutenId: "xxxx.xxxx" };

describe("applyMonetization", () => {
  it("generates amazon and rakuten URLs for affiliate rules", () => {
    const rules: MonetizationRule[] = [
      { condition: "default", type: "affiliate", keyword: "補修 パテ" },
    ];

    const result = applyMonetization({ damage_type: "ひっかき傷" }, rules, {}, ids);
    const monetization = result.monetization as MonetizationResult;

    expect(monetization.type).toBe("affiliate");
    expect(monetization.amazon_url).toContain("amazon.co.jp");
    expect(decodeURIComponent(monetization.amazon_url as string)).toContain("補修 パテ");
    expect(monetization.rakuten_url).toContain("rakuten.co.jp");
  });

  it("matches cpa rules when the condition is satisfied", () => {
    const rules: MonetizationRule[] = [
      { condition: "category === '業者依頼'", type: "cpa", cpa_url: "https://example.jp/request" },
      { condition: "default", type: "adsense" },
    ];

    const result = applyMonetization({ category: "業者依頼" }, rules, {}, ids);
    const monetization = result.monetization as MonetizationResult;

    expect(monetization.type).toBe("cpa");
    expect(monetization.cpa_url).toBe("https://example.jp/request");
  });

  it("drops unsafe cpa URLs", () => {
    const rules: MonetizationRule[] = [
      { condition: "default", type: "cpa", cpa_url: "javascript:alert(1)" },
    ];

    const result = applyMonetization({}, rules, {}, ids);
    const monetization = result.monetization as MonetizationResult;

    expect(monetization.cpa_url).toBeNull();
  });

  it("falls back to the default rule when no condition matches", () => {
    const rules: MonetizationRule[] = [
      { condition: "category === '業者依頼'", type: "cpa", cpa_url: "https://example.jp/" },
      { condition: "default", type: "adsense" },
    ];

    const result = applyMonetization({ category: "DIY" }, rules, {}, ids);
    const monetization = result.monetization as MonetizationResult;

    expect(monetization.type).toBe("adsense");
  });

  it("resolves template variables from nested product data", () => {
    const result = applyMonetization(
      {
        damage_type: "こすり傷",
        damage_level: "軽度",
        products: [
          { category: "補修材", amazon_keyword: "フローリング 補修ペン", reason: "色合わせしやすい", priority: 1 },
        ],
      },
      [{ condition: "default", type: "affiliate", keyword: "{{products[0].amazon_keyword}}" }],
      {},
      { amazonId: "test-22", rakutenId: "test-rakuten" }
    );

    const monetization = result.monetization as MonetizationResult;
    expect(monetization.amazon_url).toContain(encodeURIComponent("フローリング 補修ペン"));
    expect(monetization.amazon_url).not.toContain("%7B");
  });
});
