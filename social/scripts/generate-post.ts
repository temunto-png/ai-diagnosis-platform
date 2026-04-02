import Anthropic from "@anthropic-ai/sdk";
import type { CalendarEntry, ArticleMetadata, GeneratedPost } from "./types.js";

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

export async function generatePost(
  entry: CalendarEntry,
  article: ArticleMetadata | null
): Promise<GeneratedPost> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
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
