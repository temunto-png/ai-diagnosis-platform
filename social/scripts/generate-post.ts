import Anthropic from "@anthropic-ai/sdk";
import type { CalendarEntry, ArticleMetadata, GeneratedPost } from "./types.js";

const PRODUCT_DESCRIPTIONS: Record<string, { description: string; hashtags: string }> = {
  "カビキラー カビ取り 塩素系": {
    description: "浴室の黒カビにはコレ一択🧴\n塩素系カビキラーで根こそぎ除去。",
    hashtags: "#カビ対策 #撮偵 #浴室掃除",
  },
  "防カビスプレー 浴室 予防": {
    description: "カビ取りより予防が大事💡\n防カビスプレーで発生前にブロック。",
    hashtags: "#カビ予防 #撮偵 #ハウスケア",
  },
  "壁 補修 パテ DIY": {
    description: "壁のへこみ・穴はパテで補修🔧\n道具なしで10分で直せる。",
    hashtags: "#DIY修理 #撮偵 #壁補修",
  },
  "フローリング 傷 補修 マーカー": {
    description: "フローリングの細かいキズ✏️\n補修マーカーで目立たなく。",
    hashtags: "#DIY修理 #撮偵 #床補修",
  },
};

function generateProductPromoPost(entry: CalendarEntry): GeneratedPost {
  const keyword = entry.amazon_keyword ?? "";
  const template = PRODUCT_DESCRIPTIONS[keyword];
  const description = template?.description ?? `${keyword}をAmazonでチェック。`;
  const hashtags = template?.hashtags ?? "#撮偵 #DIY修理";
  const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=satsutei-22`;

  const text = `${description}\n↓ Amazonで確認\n${url}\n${hashtags}`;

  const result: GeneratedPost = {};
  if (entry.platforms.includes("x")) result.x = text;
  if (entry.platforms.includes("instagram")) result.instagram = text;
  return result;
}

const SYSTEM_PROMPT = `あなたは「撮偵」（satsu-tei.com）のSNS担当です。
ブランドボイス: 親しみやすい・実用的・DIY初心者向け
禁止事項: 誇大表現・価格の明記・保証表現・絵文字の乱用`;

function buildUserPrompt(
  entry: CalendarEntry,
  article: ArticleMetadata | null
): string {
  const articleContext = article
    ? `記事タイトル: ${article.title}\n概要: ${article.description}\nカテゴリ: ${article.category}`
    : `投稿コンセプト: ${entry.type}`;

  const outputFields = [
    entry.platforms.includes("x")
      ? `"x": "X投稿文（140字以内・URL除く・末尾にハッシュタグ3〜5個）"`
      : null,
    entry.platforms.includes("instagram")
      ? `"instagram": "キャプション（300字以内・末尾にハッシュタグ10〜15個）"`
      : null,
  ]
    .filter(Boolean)
    .join(",\n  ");

  return `${articleContext}
投稿タイプ: ${entry.type}

以下をJSON形式で生成してください：
{
  ${outputFields}
}
URLプレースホルダー: {{url}}`;
}

const DEFAULT_SOCIAL_MAX_TOKENS = 300;
const MIN_SOCIAL_MAX_TOKENS = 100;
const MAX_SOCIAL_MAX_TOKENS = 1024;

function resolveSocialMaxTokens(): number {
  const parsed = parseInt(process.env.CLAUDE_SOCIAL_MAX_TOKENS ?? "", 10);
  if (isNaN(parsed)) return DEFAULT_SOCIAL_MAX_TOKENS;
  return Math.min(MAX_SOCIAL_MAX_TOKENS, Math.max(MIN_SOCIAL_MAX_TOKENS, parsed));
}

export async function generatePost(
  entry: CalendarEntry,
  article: ArticleMetadata | null
): Promise<GeneratedPost> {
  if (entry.type === "product-promo") {
    return generateProductPromoPost(entry);
  }

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: resolveSocialMaxTokens(),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(entry, article) }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Claude returned no JSON: ${text}`);
  }
  return JSON.parse(jsonMatch[0]) as GeneratedPost;
}
