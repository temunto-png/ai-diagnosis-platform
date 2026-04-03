# SNS自動投稿システム Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub Actions の毎朝9時 cron で content-calendar.yml を読み、Claude API でテキスト生成し、X と Instagram に自動投稿する。

**Architecture:** `social/` をスタンドアロン Node.js パッケージとして構成する。`calendar.ts` でスケジュール解決、`generate-post.ts` で Claude Haiku を使った投稿文生成、`post-x.ts` / `post-instagram.ts` でプラットフォームへの投稿を行う。GitHub Actions ワークフローが日次実行し、Instagram Long-lived Token は月次ワークフローで自動更新する。

**Tech Stack:** Node.js 20, TypeScript (ESM), tsx, twitter-api-v2, @anthropic-ai/sdk, yaml, gray-matter, vitest

---

## ファイル構成

```
social/
  package.json                     # standalone パッケージ
  tsconfig.json
  vitest.config.ts
  content-calendar.yml             # 投稿スケジュール定義
  scripts/
    types.ts                       # 共有型定義
    calendar.ts                    # YAML パース・当日エントリ取得
    read-article.ts                # MDX フロントマター読み取り
    generate-post.ts               # Claude API テキスト生成
    post-x.ts                      # X API 投稿
    post-instagram.ts              # Instagram Graph API 投稿
    run.ts                         # エントリーポイント（オーケストレーター）
  __tests__/
    calendar.test.ts
    read-article.test.ts
    generate-post.test.ts
    post-x.test.ts
    post-instagram.test.ts
    run.test.ts
.github/workflows/
  social-post.yml                  # 日次 cron 投稿
  social-token-refresh.yml         # 月次 Instagram Token 更新
```

---

## Task 1: プロジェクトスキャフォールド

**Files:**
- Create: `social/package.json`
- Create: `social/tsconfig.json`
- Create: `social/vitest.config.ts`
- Create: `social/scripts/types.ts`

- [ ] **Step 1: package.json を作成**

```json
{
  "name": "satsu-tei-social",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "post": "tsx scripts/run.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "gray-matter": "^4.0.3",
    "twitter-api-v2": "^1.19.0",
    "yaml": "^2.7.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: tsconfig.json を作成**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "types": ["node"]
  },
  "include": ["scripts/**/*", "__tests__/**/*"]
}
```

- [ ] **Step 3: vitest.config.ts を作成**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: types.ts を作成**

```typescript
// social/scripts/types.ts

export type Platform = "x" | "instagram";

export type PostType =
  | "article-promo"
  | "tips"
  | "rental-aru-aru"
  | "seasonal";

export interface CalendarEntry {
  date: string;         // "2026-04-07"
  platforms: Platform[];
  type: PostType;
  slug: string | null;
}

export interface ContentCalendar {
  posts: CalendarEntry[];
}

export interface ArticleMetadata {
  title: string;
  description: string;
  category: string;
}

export interface GeneratedPost {
  x?: string;
  instagram?: string;
}
```

- [ ] **Step 5: 依存関係インストール**

```bash
cd social && npm install
```

Expected: `node_modules/` が作成され `package-lock.json` が生成される。

- [ ] **Step 6: コミット**

```bash
cd ..
git add social/package.json social/tsconfig.json social/vitest.config.ts social/scripts/types.ts
git commit -m "feat(social): scaffold standalone package with types"
```

---

## Task 2: カレンダーパーサー

**Files:**
- Create: `social/scripts/calendar.ts`
- Create: `social/__tests__/calendar.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// social/__tests__/calendar.test.ts
import { describe, it, expect } from "vitest";
import { findTodayEntry, parseCalendar } from "../scripts/calendar.js";
import type { ContentCalendar } from "../scripts/types.js";

const SAMPLE_YAML = `
posts:
  - date: "2026-04-07"
    platforms: [x, instagram]
    type: article-promo
    slug: drain-clog-removal
  - date: "2026-04-09"
    platforms: [x]
    type: tips
    slug: wallpaper-repair
  - date: "2026-04-11"
    platforms: [x]
    type: rental-aru-aru
    slug: null
`;

describe("parseCalendar", () => {
  it("parses YAML into ContentCalendar", () => {
    const cal = parseCalendar(SAMPLE_YAML);
    expect(cal.posts).toHaveLength(3);
    expect(cal.posts[0]).toEqual({
      date: "2026-04-07",
      platforms: ["x", "instagram"],
      type: "article-promo",
      slug: "drain-clog-removal",
    });
  });

  it("handles slug: null", () => {
    const cal = parseCalendar(SAMPLE_YAML);
    expect(cal.posts[2].slug).toBeNull();
  });
});

describe("findTodayEntry", () => {
  const calendar: ContentCalendar = {
    posts: [
      { date: "2026-04-07", platforms: ["x", "instagram"], type: "article-promo", slug: "drain-clog-removal" },
      { date: "2026-04-09", platforms: ["x"], type: "tips", slug: "wallpaper-repair" },
    ],
  };

  it("returns matching entry for today", () => {
    expect(findTodayEntry(calendar, "2026-04-07")).toEqual(calendar.posts[0]);
  });

  it("returns null when no entry matches", () => {
    expect(findTodayEntry(calendar, "2026-04-08")).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd social && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Error"
```

Expected: `Cannot find module '../scripts/calendar.js'`

- [ ] **Step 3: calendar.ts を実装**

```typescript
// social/scripts/calendar.ts
import { readFileSync } from "fs";
import { parse } from "yaml";
import type { CalendarEntry, ContentCalendar } from "./types.js";

export function parseCalendar(yaml: string): ContentCalendar {
  const data = parse(yaml) as { posts: CalendarEntry[] };
  return { posts: data.posts };
}

export function loadCalendar(calendarPath: string): ContentCalendar {
  const raw = readFileSync(calendarPath, "utf-8");
  return parseCalendar(raw);
}

export function findTodayEntry(
  calendar: ContentCalendar,
  today: string
): CalendarEntry | null {
  return calendar.posts.find((p) => p.date === today) ?? null;
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd social && npm test -- --reporter=verbose
```

Expected: `calendar.test.ts` の全テストが `PASS`

- [ ] **Step 5: コミット**

```bash
cd ..
git add social/scripts/calendar.ts social/__tests__/calendar.test.ts
git commit -m "feat(social): add calendar parser with tests"
```

---

## Task 3: 記事メタデータリーダー

**Files:**
- Create: `social/scripts/read-article.ts`
- Create: `social/__tests__/read-article.test.ts`

- [ ] **Step 1: テストを書く**

テストは実際のMDXファイルを使用する（`src/content/guide/drain-clog-removal.mdx` が存在する）。

```typescript
// social/__tests__/read-article.test.ts
import { describe, it, expect } from "vitest";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readArticleMetadata } from "../scripts/read-article.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "../../src/content/guide");

describe("readArticleMetadata", () => {
  it("reads title, description, and category from MDX frontmatter", () => {
    const meta = readArticleMetadata("drain-clog-removal", CONTENT_DIR);
    expect(meta.title).toBe("排水口のつまりを自分で解消する方法【浴室・キッチン・洗面台】");
    expect(meta.description).toContain("排水口");
    expect(meta.category).toBe("水回りDIY");
  });

  it("throws when slug does not exist", () => {
    expect(() => readArticleMetadata("nonexistent-slug", CONTENT_DIR)).toThrow();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd social && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Error"
```

Expected: `Cannot find module '../scripts/read-article.js'`

- [ ] **Step 3: read-article.ts を実装**

```typescript
// social/scripts/read-article.ts
import { readFileSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import type { ArticleMetadata } from "./types.js";

export function readArticleMetadata(slug: string, contentDir: string): ArticleMetadata {
  const filePath = join(contentDir, `${slug}.mdx`);
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  return {
    title: data["title"] as string,
    description: data["description"] as string,
    category: data["category"] as string,
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd social && npm test -- --reporter=verbose
```

Expected: `read-article.test.ts` の全テストが `PASS`

- [ ] **Step 5: コミット**

```bash
cd ..
git add social/scripts/read-article.ts social/__tests__/read-article.test.ts
git commit -m "feat(social): add MDX article metadata reader with tests"
```

---

## Task 4: テキスト生成（Claude API）

**Files:**
- Create: `social/scripts/generate-post.ts`
- Create: `social/__tests__/generate-post.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// social/__tests__/generate-post.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CalendarEntry, ArticleMetadata, GeneratedPost } from "../scripts/types.js";

// @anthropic-ai/sdk をモック
vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    _mockCreate: mockCreate,
  };
});

// モック関数を取得するヘルパー
async function getMockCreate() {
  const sdk = await import("@anthropic-ai/sdk");
  return (sdk as unknown as { _mockCreate: ReturnType<typeof vi.fn> })._mockCreate;
}

describe("generatePost", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls Claude and returns parsed JSON for X-only post", async () => {
    const mockCreate = await getMockCreate();
    const fakeJson: GeneratedPost = { x: "DIYで壁紙補修 #賃貸DIY #壁紙補修" };
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify(fakeJson) }],
    });

    const { generatePost } = await import("../scripts/generate-post.js");
    const entry: CalendarEntry = {
      date: "2026-04-09",
      platforms: ["x"],
      type: "tips",
      slug: "wallpaper-repair",
    };
    const article: ArticleMetadata = {
      title: "壁紙補修の方法",
      description: "壁紙の補修方法を解説",
      category: "壁紙・クロス",
    };

    const result = await generatePost(entry, article);
    expect(result.x).toBe("DIYで壁紙補修 #賃貸DIY #壁紙補修");
    expect(result.instagram).toBeUndefined();
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("extracts JSON even when surrounded by text", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: 'こちらです：{"x": "テスト投稿 #DIY"}' }],
    });

    const { generatePost } = await import("../scripts/generate-post.js");
    const entry: CalendarEntry = {
      date: "2026-04-11",
      platforms: ["x"],
      type: "rental-aru-aru",
      slug: null,
    };
    const result = await generatePost(entry, null);
    expect(result.x).toBe("テスト投稿 #DIY");
  });

  it("throws when Claude returns no JSON", async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "JSONなしのレスポンス" }],
    });

    const { generatePost } = await import("../scripts/generate-post.js");
    const entry: CalendarEntry = {
      date: "2026-04-11",
      platforms: ["x"],
      type: "rental-aru-aru",
      slug: null,
    };
    await expect(generatePost(entry, null)).rejects.toThrow("Claude returned no JSON");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd social && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Error"
```

Expected: `Cannot find module '../scripts/generate-post.js'`

- [ ] **Step 3: generate-post.ts を実装**

```typescript
// social/scripts/generate-post.ts
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
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd social && npm test -- --reporter=verbose
```

Expected: `generate-post.test.ts` の全テストが `PASS`

- [ ] **Step 5: コミット**

```bash
cd ..
git add social/scripts/generate-post.ts social/__tests__/generate-post.test.ts
git commit -m "feat(social): add Claude API text generator with tests"
```

---

## Task 5: X 投稿アダプター

**Files:**
- Create: `social/scripts/post-x.ts`
- Create: `social/__tests__/post-x.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// social/__tests__/post-x.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("twitter-api-v2", () => {
  const mockTweet = vi.fn();
  const MockTwitterApi = vi.fn().mockImplementation(() => ({
    v2: { tweet: mockTweet },
  }));
  return { TwitterApi: MockTwitterApi, _mockTweet: mockTweet };
});

async function getMockTweet() {
  const mod = await import("twitter-api-v2");
  return (mod as unknown as { _mockTweet: ReturnType<typeof vi.fn> })._mockTweet;
}

describe("postToX", () => {
  beforeEach(() => {
    process.env["X_API_KEY"] = "key";
    process.env["X_API_SECRET"] = "secret";
    process.env["X_ACCESS_TOKEN"] = "token";
    process.env["X_ACCESS_SECRET"] = "access_secret";
    vi.resetModules();
  });

  it("calls v2.tweet and returns tweet id", async () => {
    const mockTweet = await getMockTweet();
    mockTweet.mockResolvedValueOnce({ data: { id: "1234567890" } });

    const { postToX } = await import("../scripts/post-x.js");
    const id = await postToX("テスト投稿 #DIY");
    expect(id).toBe("1234567890");
    expect(mockTweet).toHaveBeenCalledWith("テスト投稿 #DIY");
  });

  it("propagates twitter-api-v2 errors", async () => {
    const mockTweet = await getMockTweet();
    mockTweet.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    const { postToX } = await import("../scripts/post-x.js");
    await expect(postToX("テスト")).rejects.toThrow("Rate limit exceeded");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd social && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Error"
```

Expected: `Cannot find module '../scripts/post-x.js'`

- [ ] **Step 3: post-x.ts を実装**

```typescript
// social/scripts/post-x.ts
import { TwitterApi } from "twitter-api-v2";

export async function postToX(text: string): Promise<string> {
  const client = new TwitterApi({
    appKey: process.env["X_API_KEY"]!,
    appSecret: process.env["X_API_SECRET"]!,
    accessToken: process.env["X_ACCESS_TOKEN"]!,
    accessSecret: process.env["X_ACCESS_SECRET"]!,
  });
  const tweet = await client.v2.tweet(text);
  return tweet.data.id;
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd social && npm test -- --reporter=verbose
```

Expected: `post-x.test.ts` の全テストが `PASS`

- [ ] **Step 5: コミット**

```bash
cd ..
git add social/scripts/post-x.ts social/__tests__/post-x.test.ts
git commit -m "feat(social): add X API poster with tests"
```

---

## Task 6: Instagram 投稿アダプター

**Files:**
- Create: `social/scripts/post-instagram.ts`
- Create: `social/__tests__/post-instagram.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// social/__tests__/post-instagram.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("postToInstagram", () => {
  beforeEach(() => {
    process.env["INSTAGRAM_USER_ID"] = "123456789";
    process.env["INSTAGRAM_ACCESS_TOKEN"] = "test_token";
    mockFetch.mockReset();
  });

  it("fetches OG image, creates container, and publishes", async () => {
    // 1. OGP fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<meta property="og:image" content="https://satsu-tei.com/og.png"/>',
    });
    // 2. /media (create container)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "container_001" }),
    });
    // 3. /media_publish
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "post_001" }),
    });

    const { postToInstagram } = await import("../scripts/post-instagram.js");
    const postId = await postToInstagram("テストキャプション", "https://satsu-tei.com/guide/drain-clog-removal/");
    expect(postId).toBe("post_001");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws when OG image is not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body>no og image</body></html>",
    });

    const { postToInstagram } = await import("../scripts/post-instagram.js");
    await expect(
      postToInstagram("キャプション", "https://satsu-tei.com/guide/drain-clog-removal/")
    ).rejects.toThrow("No OG image found");
  });

  it("throws when media create fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<meta property="og:image" content="https://satsu-tei.com/og.png"/>',
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => "Bad Request",
    });

    const { postToInstagram } = await import("../scripts/post-instagram.js");
    await expect(
      postToInstagram("キャプション", "https://satsu-tei.com/guide/drain-clog-removal/")
    ).rejects.toThrow("Instagram media create failed");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd social && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Error"
```

Expected: `Cannot find module '../scripts/post-instagram.js'`

- [ ] **Step 3: post-instagram.ts を実装**

```typescript
// social/scripts/post-instagram.ts
const GRAPH_BASE = "https://graph.facebook.com/v19.0";

async function getOgImage(articleUrl: string): Promise<string | null> {
  const res = await fetch(articleUrl);
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
  return match ? match[1] : null;
}

export async function postToInstagram(
  caption: string,
  articleUrl: string
): Promise<string> {
  const userId = process.env["INSTAGRAM_USER_ID"]!;
  const token = process.env["INSTAGRAM_ACCESS_TOKEN"]!;

  const imageUrl = await getOgImage(articleUrl);
  if (!imageUrl) {
    throw new Error(`No OG image found for ${articleUrl}`);
  }

  // Step 1: メディアコンテナ作成
  const createRes = await fetch(`${GRAPH_BASE}/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  if (!createRes.ok) {
    throw new Error(`Instagram media create failed: ${await createRes.text()}`);
  }
  const { id: creationId } = (await createRes.json()) as { id: string };

  // Step 2: 公開
  const publishRes = await fetch(`${GRAPH_BASE}/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  if (!publishRes.ok) {
    throw new Error(`Instagram publish failed: ${await publishRes.text()}`);
  }
  const { id: postId } = (await publishRes.json()) as { id: string };
  return postId;
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd social && npm test -- --reporter=verbose
```

Expected: `post-instagram.test.ts` の全テストが `PASS`

- [ ] **Step 5: コミット**

```bash
cd ..
git add social/scripts/post-instagram.ts social/__tests__/post-instagram.test.ts
git commit -m "feat(social): add Instagram Graph API poster with tests"
```

---

## Task 7: オーケストレーター（run.ts）

**Files:**
- Create: `social/scripts/run.ts`
- Create: `social/__tests__/run.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// social/__tests__/run.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../scripts/calendar.js", () => ({
  loadCalendar: vi.fn(),
  findTodayEntry: vi.fn(),
}));
vi.mock("../scripts/read-article.js", () => ({
  readArticleMetadata: vi.fn(),
}));
vi.mock("../scripts/generate-post.js", () => ({
  generatePost: vi.fn(),
}));
vi.mock("../scripts/post-x.js", () => ({
  postToX: vi.fn(),
}));
vi.mock("../scripts/post-instagram.js", () => ({
  postToInstagram: vi.fn(),
}));

import { loadCalendar, findTodayEntry } from "../scripts/calendar.js";
import { readArticleMetadata } from "../scripts/read-article.js";
import { generatePost } from "../scripts/generate-post.js";
import { postToX } from "../scripts/post-x.js";
import { postToInstagram } from "../scripts/post-instagram.js";
import type { CalendarEntry, ContentCalendar } from "../scripts/types.js";

const mockLoadCalendar = vi.mocked(loadCalendar);
const mockFindTodayEntry = vi.mocked(findTodayEntry);
const mockReadArticle = vi.mocked(readArticleMetadata);
const mockGeneratePost = vi.mocked(generatePost);
const mockPostX = vi.mocked(postToX);
const mockPostInstagram = vi.mocked(postToInstagram);

describe("run", () => {
  const mockCalendar: ContentCalendar = { posts: [] };
  const entryX: CalendarEntry = {
    date: "2026-04-09",
    platforms: ["x"],
    type: "tips",
    slug: "wallpaper-repair",
  };
  const entryBoth: CalendarEntry = {
    date: "2026-04-07",
    platforms: ["x", "instagram"],
    type: "article-promo",
    slug: "drain-clog-removal",
  };

  beforeEach(() => {
    vi.resetModules();
    mockLoadCalendar.mockReturnValue(mockCalendar);
    mockReadArticle.mockReturnValue({
      title: "壁紙補修の方法",
      description: "壁紙の補修",
      category: "壁紙・クロス",
    });
  });

  it("exits silently when no entry scheduled", async () => {
    mockFindTodayEntry.mockReturnValue(null);
    const { main } = await import("../scripts/run.js");
    await expect(main("2026-04-08")).resolves.toBeUndefined();
    expect(mockGeneratePost).not.toHaveBeenCalled();
  });

  it("posts to X only when platforms is [x]", async () => {
    mockFindTodayEntry.mockReturnValue(entryX);
    mockGeneratePost.mockResolvedValue({ x: "DIYで壁紙補修 {{url}} #DIY" });
    mockPostX.mockResolvedValue("tweet_001");

    const { main } = await import("../scripts/run.js");
    await main("2026-04-09");

    expect(mockPostX).toHaveBeenCalledWith(
      "DIYで壁紙補修 https://satsu-tei.com/guide/wallpaper-repair/ #DIY"
    );
    expect(mockPostInstagram).not.toHaveBeenCalled();
  });

  it("posts to both X and Instagram when platforms includes instagram", async () => {
    mockFindTodayEntry.mockReturnValue(entryBoth);
    mockGeneratePost.mockResolvedValue({
      x: "記事紹介 {{url}} #DIY",
      instagram: "記事紹介キャプション #賃貸DIY",
    });
    mockPostX.mockResolvedValue("tweet_002");
    mockPostInstagram.mockResolvedValue("ig_post_001");

    const { main } = await import("../scripts/run.js");
    await main("2026-04-07");

    expect(mockPostX).toHaveBeenCalledWith(
      "記事紹介 https://satsu-tei.com/guide/drain-clog-removal/ #DIY"
    );
    expect(mockPostInstagram).toHaveBeenCalledWith(
      "記事紹介キャプション #賃貸DIY",
      "https://satsu-tei.com/guide/drain-clog-removal/"
    );
  });

  it("skips article read when slug is null", async () => {
    const entryNoSlug: CalendarEntry = {
      date: "2026-04-11",
      platforms: ["x"],
      type: "rental-aru-aru",
      slug: null,
    };
    mockFindTodayEntry.mockReturnValue(entryNoSlug);
    mockGeneratePost.mockResolvedValue({ x: "賃貸あるある #賃貸" });
    mockPostX.mockResolvedValue("tweet_003");

    const { main } = await import("../scripts/run.js");
    await main("2026-04-11");

    expect(mockReadArticle).not.toHaveBeenCalled();
    expect(mockGeneratePost).toHaveBeenCalledWith(entryNoSlug, null);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd social && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Error"
```

Expected: `Cannot find module '../scripts/run.js'`

- [ ] **Step 3: run.ts を実装**

```typescript
// social/scripts/run.ts
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadCalendar, findTodayEntry } from "./calendar.js";
import { readArticleMetadata } from "./read-article.js";
import { generatePost } from "./generate-post.js";
import { postToX } from "./post-x.js";
import { postToInstagram } from "./post-instagram.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CALENDAR_PATH = join(__dirname, "../content-calendar.yml");
const CONTENT_DIR = join(__dirname, "../../src/content/guide");
const SITE_BASE = "https://satsu-tei.com";

export async function main(today: string): Promise<void> {
  const calendar = loadCalendar(CALENDAR_PATH);
  const entry = findTodayEntry(calendar, today);

  if (!entry) {
    console.log(`[${today}] No post scheduled. Exiting.`);
    return;
  }

  console.log(`[${today}] type=${entry.type} platforms=${entry.platforms.join(",")}`);

  const article = entry.slug
    ? readArticleMetadata(entry.slug, CONTENT_DIR)
    : null;
  const articleUrl = entry.slug
    ? `${SITE_BASE}/guide/${entry.slug}/`
    : SITE_BASE;

  const generated = await generatePost(entry, article);
  const results: string[] = [];

  if (entry.platforms.includes("x") && generated.x) {
    const text = generated.x.replace("{{url}}", articleUrl);
    const tweetId = await postToX(text);
    results.push(`X: https://twitter.com/i/web/status/${tweetId}`);
  }

  if (entry.platforms.includes("instagram") && generated.instagram) {
    const caption = generated.instagram.replace("{{url}}", articleUrl);
    const postId = await postToInstagram(caption, articleUrl);
    results.push(`Instagram: ${postId}`);
  }

  console.log("Posted:", results.join(", "));
}

// CLI エントリーポイント（GitHub Actions から実行）
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const today = new Date().toISOString().slice(0, 10);
  main(today).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd social && npm test -- --reporter=verbose
```

Expected: `run.test.ts` の全テストが `PASS`。全テストスイートの合計が 13 件以上 `PASS`。

- [ ] **Step 5: コミット**

```bash
cd ..
git add social/scripts/run.ts social/__tests__/run.test.ts
git commit -m "feat(social): add orchestrator run.ts with integration tests"
```

---

## Task 8: GitHub Actions ワークフロー

**Files:**
- Create: `.github/workflows/social-post.yml`
- Create: `.github/workflows/social-token-refresh.yml`

- [ ] **Step 1: social-post.yml を作成**

```yaml
# .github/workflows/social-post.yml
name: SNS Auto Post

on:
  schedule:
    - cron: "0 0 * * *"   # 毎日 9:00 JST (UTC 0:00)
  workflow_dispatch:        # 手動実行も可能

jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: social/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: social

      - name: Run auto post
        run: npx tsx scripts/run.ts
        working-directory: social
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          X_API_KEY: ${{ secrets.X_API_KEY }}
          X_API_SECRET: ${{ secrets.X_API_SECRET }}
          X_ACCESS_TOKEN: ${{ secrets.X_ACCESS_TOKEN }}
          X_ACCESS_SECRET: ${{ secrets.X_ACCESS_SECRET }}
          INSTAGRAM_USER_ID: ${{ secrets.INSTAGRAM_USER_ID }}
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
```

- [ ] **Step 2: social-token-refresh.yml を作成**

Instagram Long-lived Token は60日で失効するため、月次で更新しRepository Secretに書き戻す。書き戻しには `GH_PAT`（`secrets:write` 権限を持つ PAT）が必要。

```yaml
# .github/workflows/social-token-refresh.yml
name: Instagram Token Refresh

on:
  schedule:
    - cron: "0 1 1 * *"   # 毎月1日 10:00 JST (UTC 1:00)
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh Instagram Long-lived Token
        env:
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
          GH_TOKEN: ${{ secrets.GH_PAT }}
        run: |
          RESPONSE=$(curl -sf \
            "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=ig_refresh_token&access_token=${INSTAGRAM_ACCESS_TOKEN}")
          NEW_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')

          if [ -z "$NEW_TOKEN" ] || [ "$NEW_TOKEN" = "null" ]; then
            echo "ERROR: Failed to refresh token. Response: $RESPONSE"
            exit 1
          fi

          echo "$NEW_TOKEN" | gh secret set INSTAGRAM_ACCESS_TOKEN \
            --repo "${{ github.repository }}"
          echo "Token refreshed successfully."
```

- [ ] **Step 3: ワークフローの YAML 構文を確認**

```bash
# actionlint がインストールされている場合
# actionlint .github/workflows/social-post.yml .github/workflows/social-token-refresh.yml

# 代替: YAML 構文チェック
node -e "
const fs = require('fs');
const yaml = require('js-yaml');
yaml.load(fs.readFileSync('.github/workflows/social-post.yml', 'utf8'));
yaml.load(fs.readFileSync('.github/workflows/social-token-refresh.yml', 'utf8'));
console.log('YAML syntax OK');
"
```

Expected: `YAML syntax OK`（エラーが出た場合は修正する）

- [ ] **Step 4: コミット**

```bash
git add .github/workflows/social-post.yml .github/workflows/social-token-refresh.yml
git commit -m "feat(social): add GitHub Actions workflows for daily post and token refresh"
```

---

## Task 9: コンテンツカレンダー初期データ

**Files:**
- Create: `social/content-calendar.yml`

- [ ] **Step 1: content-calendar.yml を作成**

既存ガイド記事12本からスラッグを選んで4月〜5月分を定義する。

```yaml
# social/content-calendar.yml
# 投稿スケジュール定義
# platforms: [x] or [x, instagram]
# type: article-promo | tips | rental-aru-aru | seasonal
# slug: src/content/guide/ 配下のファイル名（.mdx 除く）。null の場合は Claude がフリー生成

posts:
  # --- 2026年4月 ---
  - date: "2026-04-07"
    platforms: [x, instagram]
    type: article-promo
    slug: drain-clog-removal

  - date: "2026-04-09"
    platforms: [x]
    type: tips
    slug: wallpaper-repair

  - date: "2026-04-11"
    platforms: [x]
    type: rental-aru-aru
    slug: null

  - date: "2026-04-14"
    platforms: [x, instagram]
    type: article-promo
    slug: black-mold-removal

  - date: "2026-04-16"
    platforms: [x]
    type: tips
    slug: rental-wall-repair

  - date: "2026-04-18"
    platforms: [x]
    type: rental-aru-aru
    slug: null

  - date: "2026-04-21"
    platforms: [x, instagram]
    type: article-promo
    slug: headlight-polish

  - date: "2026-04-23"
    platforms: [x]
    type: tips
    slug: mold-prevention-spray

  - date: "2026-04-25"
    platforms: [x]
    type: rental-aru-aru
    slug: null

  - date: "2026-04-28"
    platforms: [x, instagram]
    type: seasonal
    slug: null

  # --- 2026年5月 ---
  - date: "2026-05-02"
    platforms: [x, instagram]
    type: article-promo
    slug: floor-repair-paste

  - date: "2026-05-05"
    platforms: [x]
    type: tips
    slug: wallpaper-repair-seal

  - date: "2026-05-07"
    platforms: [x]
    type: rental-aru-aru
    slug: null

  - date: "2026-05-09"
    platforms: [x, instagram]
    type: article-promo
    slug: flooring-scratch

  - date: "2026-05-12"
    platforms: [x]
    type: tips
    slug: car-scratch-repair

  - date: "2026-05-14"
    platforms: [x]
    type: seasonal
    slug: null

  - date: "2026-05-16"
    platforms: [x, instagram]
    type: article-promo
    slug: tire-check-timing

  - date: "2026-05-19"
    platforms: [x]
    type: tips
    slug: winter-tire-timing

  - date: "2026-05-21"
    platforms: [x]
    type: rental-aru-aru
    slug: null

  - date: "2026-05-23"
    platforms: [x, instagram]
    type: seasonal
    slug: null
```

- [ ] **Step 2: カレンダーが正しくパースされることを確認**

```bash
cd social && node -e "
import('./scripts/calendar.js').then(({ loadCalendar }) => {
  const cal = loadCalendar('./content-calendar.yml');
  console.log('Total posts:', cal.posts.length);
  console.log('First entry:', JSON.stringify(cal.posts[0]));
}).catch(console.error);
"
```

Expected: `Total posts: 20` と最初のエントリが表示される

- [ ] **Step 3: 全テストが通ることを最終確認**

```bash
cd social && npm test -- --reporter=verbose
```

Expected: 全テストスイートが `PASS`（13件以上）

- [ ] **Step 4: コミット**

```bash
cd ..
git add social/content-calendar.yml
git commit -m "feat(social): add initial content calendar for April-May 2026"
```

---

## 完了後チェックリスト（手動対応）

実装完了後、以下を手動で行う必要がある:

| # | 作業 | 備考 |
|---|------|------|
| 1 | X アカウント開設 + Developer Portal で App 作成 | Free tier 選択 |
| 2 | X API Key/Secret + Access Token/Secret を取得 | OAuth 1.0a User Context |
| 3 | Instagram アカウント開設（Professional/Business） | Facebook ページと連携 |
| 4 | Facebook Developer App 作成 + Instagram Graph API 有効化 | |
| 5 | Instagram Long-lived Token 取得（60日有効） | Graph API Explorer で取得 |
| 6 | GitHub Repository Secrets に登録 | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`, `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`, `GH_PAT` |
| 7 | `GH_PAT` は `repo` スコープで発行 | token-refresh ワークフロー用 |
| 8 | workflow_dispatch で手動テスト実行 | 初回は実際の投稿が走るため注意 |
