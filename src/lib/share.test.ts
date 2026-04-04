import { describe, expect, it } from "vitest";
import { buildShareText, buildShareUrl } from "./share";

describe("buildShareText", () => {
  it("kabi-diagnosis: mold_type と severity を含むテキストを生成する", () => {
    const text = buildShareText(
      "kabi-diagnosis",
      { mold_type: "黒カビ", severity: "中度" },
      "https://satsu-tei.com/kabi-diagnosis/"
    );
    expect(text).toContain("「黒カビ・中度」でした");
    expect(text).toContain("#カビ診断");
    expect(text).toContain("#撮偵");
    expect(text).toContain("https://satsu-tei.com/kabi-diagnosis/");
  });

  it("kabi-diagnosis: フィールドが空のときフォールバックテキストを使う", () => {
    const text = buildShareText("kabi-diagnosis", {}, "https://satsu-tei.com/kabi-diagnosis/");
    expect(text).toContain("診断結果を確認してみて📷");
    expect(text).toContain("#カビ診断");
  });

  it("diy-repair: damage_type と damage_level を含むテキストを生成する", () => {
    const text = buildShareText(
      "diy-repair",
      { damage_type: "ひっかき傷", damage_level: "軽度" },
      "https://satsu-tei.com/diy-repair/"
    );
    expect(text).toContain("「ひっかき傷・軽度」でした");
    expect(text).toContain("#DIY修理診断");
    expect(text).toContain("#撮偵");
    expect(text).toContain("https://satsu-tei.com/diy-repair/");
  });

  it("diy-repair: フィールドが片方だけでも生成できる", () => {
    const text = buildShareText(
      "diy-repair",
      { damage_type: "はがれ" },
      "https://satsu-tei.com/diy-repair/"
    );
    expect(text).toContain("「はがれ」でした");
  });

  it("未知の appId: デフォルトハッシュタグを使う", () => {
    const text = buildShareText("unknown-app", {}, "https://satsu-tei.com/unknown-app/");
    expect(text).toContain("#AI診断");
    expect(text).toContain("#撮偵");
  });

  it("pageUrl がテキストに含まれる", () => {
    const url = "https://satsu-tei.com/kabi-diagnosis/";
    const text = buildShareText("kabi-diagnosis", { severity: "軽度" }, url);
    expect(text).toContain(url);
  });
});

describe("buildShareUrl", () => {
  it("X の intent/tweet URL を返す", () => {
    const url = buildShareUrl("テストテキスト #撮偵");
    expect(url).toMatch(/^https:\/\/x\.com\/intent\/tweet\?text=/);
  });

  it("テキストが URL エンコードされる", () => {
    const url = buildShareUrl("AI診断 #カビ診断");
    expect(url).not.toContain("#カビ診断");
    expect(url).toContain(encodeURIComponent("AI診断 #カビ診断"));
  });
});
