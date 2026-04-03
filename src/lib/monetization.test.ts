import { describe, it, expect } from "vitest";
import { applyMonetization } from "./monetization";
import type { MonetizationRule } from "../configs/index";
import type { MonetizationResult } from "./types";

const ids = { amazonId: "testsite-22", rakutenId: "xxxx.xxxx" };

describe("applyMonetization", () => {
  it("affiliate rule: generates amazon and rakuten URLs", () => {
    const rules: MonetizationRule[] = [
      { condition: "default", type: "affiliate", keyword: "壁紙補修シール" },
    ];
    const result = applyMonetization({ damage_type: "壁紙破れ" }, rules, {}, ids);

    expect(result.monetization).toBeDefined();
    const m = result.monetization as MonetizationResult;
    expect(m.type).toBe("affiliate");
    const amazonUrl = m.amazon_url as string;
    expect(amazonUrl).toContain("amazon.co.jp");
    expect(decodeURIComponent(amazonUrl)).toContain("壁紙補修シール");
    expect(amazonUrl).toContain("testsite-22");
    const rakutenUrl = m.rakuten_url as string;
    expect(rakutenUrl).toContain("rakuten.co.jp");
  });

  it("cpa rule with condition: matches correctly", () => {
    const rules: MonetizationRule[] = [
      { condition: "category === '粗大ゴミ'", type: "cpa", cpa_url: "https://example.jp/?s=gomi" },
      { condition: "default", type: "adsense" },
    ];
    const result = applyMonetization({ category: "粗大ゴミ" }, rules, {}, ids);
    const m = result.monetization as MonetizationResult;
    expect(m.type).toBe("cpa");
    expect(m.cpa_url).toBe("https://example.jp/?s=gomi");
  });

  it("falls through to default when condition doesn't match", () => {
    const rules: MonetizationRule[] = [
      { condition: "category === '粗大ゴミ'", type: "cpa", cpa_url: "https://example.jp/" },
      { condition: "default", type: "adsense" },
    ];
    const result = applyMonetization({ category: "燃えるゴミ" }, rules, {}, ids);
    const m = result.monetization as MonetizationResult;
    expect(m.type).toBe("adsense");
  });

  it("template variable {{key}} is replaced from result", () => {
    const rules: MonetizationRule[] = [
      { condition: "default", type: "affiliate", keyword: "{{amazon_keyword}}" },
    ];
    const result = applyMonetization({ amazon_keyword: "補修マーカー" }, rules, {}, ids);
    const m = result.monetization as MonetizationResult;
    const amazonUrl = m.amazon_url as string;
    expect(decodeURIComponent(amazonUrl)).toContain("補修マーカー");
  });

  it("products[0].amazon_keyword のネストパスが解決される", () => {
    const result = applyMonetization(
      {
        damage_type: "壁紙破れ",
        damage_level: "軽微",
        products: [
          { category: "補修テープ", amazon_keyword: "壁紙補修テープ", reason: "手軽", priority: 1 },
        ],
      },
      [{ condition: "default", type: "affiliate", keyword: "{{products[0].amazon_keyword}}" }],
      {},
      { amazonId: "test-22", rakutenId: "test-rakuten" }
    );
    const m = result.monetization as MonetizationResult;
    expect(m.amazon_url).toContain(encodeURIComponent("壁紙補修テープ"));
    expect(m.amazon_url).not.toContain("%7B");
  });
});
