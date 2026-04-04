import type { DiagnosisData } from "./types";

const APP_HASHTAGS: Record<string, string> = {
  "diy-repair": "#DIY修理診断 #撮偵",
  "kabi-diagnosis": "#カビ診断 #撮偵",
};

const DEFAULT_HASHTAGS = "#AI診断 #撮偵";

export function buildShareText(appId: string, data: DiagnosisData, pageUrl: string): string {
  const hashtags = APP_HASHTAGS[appId] ?? DEFAULT_HASHTAGS;

  let intro = "";
  let result = "";

  if (appId === "diy-repair") {
    intro = "壁や床のキズをAI診断してみた！";
    const parts = [data.damage_type, data.damage_level].filter(Boolean);
    result = parts.length > 0 ? `結果：「${parts.join("・")}」でした📷` : "診断結果を確認してみて📷";
  } else if (appId === "kabi-diagnosis") {
    intro = "住まいのカビをAI診断してみた！";
    const parts = [data.mold_type, data.severity].filter(Boolean);
    result = parts.length > 0 ? `結果：「${parts.join("・")}」でした📷` : "診断結果を確認してみて📷";
  } else {
    intro = "AI診断してみた！";
    result = "診断結果を確認してみて📷";
  }

  return `${intro}\n${result}\n↓診断してみる\n${pageUrl}\n${hashtags}`;
}

export function buildShareUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
