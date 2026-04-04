import { describe, expect, it } from "vitest";
import { buildShareText, buildShareUrl } from "../lib/share";

// ShareBlock が内部で使う share ユーティリティの結合テスト
describe("ShareBlock: シェアテキスト生成", () => {
  it("kabi-diagnosis の診断結果からシェアURLを組み立てられる", () => {
    const data = { mold_type: "白カビ", severity: "軽度" };
    const pageUrl = "https://satsu-tei.com/kabi-diagnosis/";

    const text = buildShareText("kabi-diagnosis", data, pageUrl);
    const url = buildShareUrl(text);

    expect(url).toMatch(/^https:\/\/x\.com\/intent\/tweet\?text=/);
    expect(decodeURIComponent(url)).toContain("「白カビ・軽度」");
    expect(decodeURIComponent(url)).toContain("#カビ診断");
    expect(decodeURIComponent(url)).toContain(pageUrl);
  });

  it("diy-repair の診断結果からシェアURLを組み立てられる", () => {
    const data = { damage_type: "へこみ", damage_level: "中度" };
    const pageUrl = "https://satsu-tei.com/diy-repair/";

    const text = buildShareText("diy-repair", data, pageUrl);
    const url = buildShareUrl(text);

    expect(url).toMatch(/^https:\/\/x\.com\/intent\/tweet\?text=/);
    expect(decodeURIComponent(url)).toContain("「へこみ・中度」");
    expect(decodeURIComponent(url)).toContain("#DIY修理診断");
  });
});
