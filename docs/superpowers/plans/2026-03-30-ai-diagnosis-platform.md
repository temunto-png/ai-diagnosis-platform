# AI画像診断プラットフォーム 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Astro + Cloudflare Pages Functionsで動くAI画像診断プラットフォームを構築し、アフィリエイト・AdSenseで収益化する基盤を1週間で完成させる。

**Architecture:** 単一Astroプロジェクト（`output: "server"`）をCloudflare Pagesにデプロイ。`src/pages/api/[appId]/analyze.ts` がPages Function（Workers runtime）として動作し、Claude Haiku APIで画像診断を行う。アプリ設定は静的JSONファイルで管理し、デプロイなしに切り替えるKVは将来対応。

**Tech Stack:** Astro 4.x, @astrojs/cloudflare, @astrojs/react, @astrojs/mdx, Vitest, TypeScript, Claude API (claude-haiku-4-5), Cloudflare Pages

---

## ファイル構造（全タスク完了後）

```
ai-diagnosis-platform/
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── .env.example
├── .dev.vars               # ローカル開発用シークレット（gitignore）
├── vitest.config.ts
│
├── public/
│   └── og/
│       ├── diy-repair.png  # 静的OGP画像（アプリごとに1枚）
│       └── kabi-diagnosis.png
│
└── src/
    ├── env.d.ts            # 型定義（Cloudflare env + Astro locals）
    │
    ├── layouts/
    │   └── Base.astro      # 全ページ共通レイアウト（アフィリエイト表示含む）
    │
    ├── pages/
    │   ├── index.astro                        # トップ（アプリ一覧）
    │   ├── [appId]/
    │   │   ├── index.astro                    # 診断UI
    │   │   └── result/[uuid].astro            # 診断結果シェアページ
    │   ├── api/
    │   │   └── [appId]/analyze.ts             # Pages Function（診断API）
    │   ├── guide/
    │   │   ├── index.astro                    # 記事一覧
    │   │   └── [slug].astro                   # 個別記事
    │   ├── privacy.astro
    │   ├── terms.astro
    │   ├── contact.astro
    │   └── about.astro
    │
    ├── components/
    │   ├── ImageUploader.tsx    # 画像選択+クライアント側リサイズ（Reactクライアント）
    │   ├── DiagnosisResult.tsx  # 診断結果表示（Reactクライアント）
    │   ├── AffiliateBlock.tsx   # アフィリエイトリンク（Reactクライアント）
    │   ├── AdUnit.astro         # AdSense広告ユニット
    │   └── AmazonLink.astro     # AmazonリンクコンポーネントMDX用）
    │
    ├── lib/
    │   ├── claude.ts           # Claude API呼び出し（Haiku固定 + Prompt Caching）
    │   ├── monetization.ts     # 収益ロジック（アフィリエイトURL生成）
    │   └── rate-limit.ts       # インメモリレートリミット
    │
    ├── configs/
    │   ├── index.ts            # 全設定を統合export
    │   ├── diy-repair.json
    │   ├── kabi-diagnosis.json
    │   └── affiliate-programs.json
    │
    └── content/
        ├── config.ts           # Astro Content Collections設定
        └── guide/
            ├── wallpaper-repair.mdx
            ├── flooring-scratch.mdx
            ├── black-mold-removal.mdx
            ├── tire-check-timing.mdx
            ├── winter-tire-timing.mdx
            ├── floor-repair-paste.mdx
            ├── rental-wall-repair.mdx
            ├── mold-prevention-spray.mdx
            ├── car-scratch-repair.mdx
            └── wallpaper-repair-seal.mdx
```

---

## Task 1: プロジェクトスキャフォールド

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`

- [ ] **Step 1: Astroプロジェクトを初期化**

```bash
cd C:\tool\claude\ai-diagnosis-platform
npm create astro@latest . -- --template minimal --typescript strict --no-git --install
```

Expected: `ai-diagnosis-platform` ディレクトリにAstroの最小構成が作られる。

- [ ] **Step 2: 必要なパッケージをインストール**

```bash
npm install @astrojs/cloudflare @astrojs/react @astrojs/mdx react react-dom
npm install -D vitest @cloudflare/vitest-pool-workers @types/react
```

- [ ] **Step 3: astro.config.mjsを設定**

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [react(), mdx()],
});
```

- [ ] **Step 4: tsconfig.jsonを確認・更新**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true,
    "allowJs": true
  }
}
```

- [ ] **Step 5: vitest.config.tsを作成**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: 動作確認**

```bash
npm run dev
```

Expected: `http://localhost:4321` でAstroの初期ページが表示される。

- [ ] **Step 7: コミット**

```bash
git init
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts
git commit -m "chore: scaffold Astro project with Cloudflare adapter"
```

---

## Task 2: 型定義 + 環境変数設定

**Files:**
- Create: `src/env.d.ts`
- Create: `.env.example`
- Create: `.dev.vars`（gitignore済み）

- [ ] **Step 1: .gitignoreに機密ファイルを追加**

`.gitignore` に以下が含まれていることを確認（なければ追加）：

```
.dev.vars
.env
node_modules/
dist/
.cloudflare/
```

- [ ] **Step 2: .env.exampleを作成**

```bash
# .env.example
PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
PUBLIC_AMAZON_ASSOCIATE_ID=yoursite-22
```

- [ ] **Step 3: .dev.varsを作成（ローカル開発用シークレット）**

```bash
# .dev.vars  ← gitignore済み。実際の値を入れる
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXX
AMAZON_ASSOCIATE_ID=yoursite-22
RAKUTEN_AFFILIATE_ID=xxxxxxxx.xxxxxxxx
```

- [ ] **Step 4: src/env.d.tsを作成**

```typescript
// src/env.d.ts
/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

type CloudflareEnv = {
  ANTHROPIC_API_KEY: string;
  AMAZON_ASSOCIATE_ID: string;
  RAKUTEN_AFFILIATE_ID: string;
};

declare namespace App {
  interface Locals {
    runtime: {
      env: CloudflareEnv;
    };
  }
}
```

- [ ] **Step 5: コミット**

```bash
git add src/env.d.ts .env.example .gitignore
git commit -m "chore: add type definitions and env configuration"
```

---

## Task 3: アプリ設定JSON + ローダー

**Files:**
- Create: `src/configs/diy-repair.json`
- Create: `src/configs/kabi-diagnosis.json`
- Create: `src/configs/affiliate-programs.json`
- Create: `src/configs/index.ts`
- Create: `src/configs/index.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```typescript
// src/configs/index.test.ts
import { describe, it, expect } from "vitest";
import { getConfig, listApps } from "./index";

describe("getConfig", () => {
  it("returns config for known appId", () => {
    const config = getConfig("diy-repair");
    expect(config).not.toBeNull();
    expect(config?.name).toBe("DIY補修診断");
    expect(config?.prompt).toContain("DIY補修");
    expect(config?.daily_limit).toBeGreaterThan(0);
  });

  it("returns null for unknown appId", () => {
    expect(getConfig("unknown-app")).toBeNull();
  });
});

describe("listApps", () => {
  it("returns array with at least 2 apps", () => {
    const apps = listApps();
    expect(apps.length).toBeGreaterThanOrEqual(2);
  });

  it("each app has id and name", () => {
    listApps().forEach((app) => {
      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/configs/index.test.ts
```

Expected: FAIL "Cannot find module './index'"

- [ ] **Step 3: JSONファイルを作成**

```json
// src/configs/diy-repair.json
{
  "name": "DIY補修診断",
  "description": "壁・床・木材の傷や汚れを撮影して補修材を診断",
  "daily_limit": 5,
  "prompt": "あなたはDIY補修の専門家です。画像を解析し、以下のJSONのみを返してください（説明文不要）:\n{\n  \"damage_type\": \"壁紙破れ|木材傷|床傷|カビ|その他\",\n  \"damage_level\": \"軽微|中程度|重度\",\n  \"color_description\": \"色の説明\",\n  \"products\": [\n    {\n      \"category\": \"商品カテゴリ名\",\n      \"amazon_keyword\": \"Amazon検索キーワード\",\n      \"reason\": \"推奨理由（1文）\",\n      \"priority\": 1\n    }\n  ],\n  \"diy_tip\": \"補修のコツ（1〜2文）\"\n}",
  "monetization": [
    { "condition": "default", "type": "affiliate", "keyword": "{{products[0].amazon_keyword}}" }
  ],
  "seo": {
    "title": "DIY補修材を診断 | AI補修診断",
    "description": "壁紙・床・木材の傷を撮影するだけでAIが補修材を提案します",
    "keywords": ["壁紙 補修 DIY", "フローリング 傷 補修", "賃貸 壁 穴 補修"]
  }
}
```

```json
// src/configs/kabi-diagnosis.json
{
  "name": "カビ診断",
  "description": "壁・浴室・押入れのカビを撮影して対処法と洗剤を診断",
  "daily_limit": 5,
  "prompt": "あなたはカビ・防カビの専門家です。画像を解析し、以下のJSONのみを返してください（説明文不要）:\n{\n  \"mold_type\": \"黒カビ|白カビ|ピンクカビ|その他\",\n  \"severity\": \"初期|中程度|重度\",\n  \"location\": \"浴室|壁|天井|押入れ|その他\",\n  \"products\": [\n    {\n      \"category\": \"商品カテゴリ名\",\n      \"amazon_keyword\": \"Amazon検索キーワード\",\n      \"reason\": \"推奨理由（1文）\",\n      \"priority\": 1\n    }\n  ],\n  \"prevention_tip\": \"再発防止のコツ（1〜2文）\"\n}",
  "monetization": [
    { "condition": "default", "type": "affiliate", "keyword": "{{products[0].amazon_keyword}}" }
  ],
  "seo": {
    "title": "カビ診断 | AIカビ対策診断",
    "description": "カビを撮影するだけでAIが種類を特定し最適な洗剤を提案します",
    "keywords": ["カビ 洗剤 おすすめ", "黒カビ 落とし方", "浴室 カビ 防止"]
  }
}
```

```json
// src/configs/affiliate-programs.json
{
  "programs": [
    {
      "id": "a8-base",
      "name": "A8.net",
      "asp": "a8",
      "status": "account_registered",
      "site_add_required": true,
      "media_url": "https://example.com/guide/"
    },
    {
      "id": "moshimo-base",
      "name": "もしもアフィリエイト",
      "asp": "moshimo",
      "status": "account_registered",
      "site_add_required": true,
      "media_url": "https://example.com/guide/"
    },
    {
      "id": "rakuten-base",
      "name": "楽天アフィリエイト",
      "asp": "rakuten-direct",
      "status": "account_registered",
      "site_add_required": true,
      "affiliate_id": "",
      "cookie_days": 30
    },
    {
      "id": "amazon-associate",
      "name": "Amazonアソシエイト（本家）",
      "asp": "amazon-direct",
      "status": "pending",
      "associate_id": "",
      "applied_at": null,
      "deadline_180day": null,
      "sales_count": 0,
      "sales_needed": 3
    },
    {
      "id": "google-adsense",
      "name": "Googleアドセンス",
      "asp": "google",
      "status": "pending",
      "client_id": ""
    }
  ]
}
```

- [ ] **Step 4: src/configs/index.tsを実装**

```typescript
// src/configs/index.ts
import diyRepair from "./diy-repair.json";
import kabiDiagnosis from "./kabi-diagnosis.json";

export type MonetizationRule = {
  condition: string;
  type: "affiliate" | "cpa" | "adsense";
  keyword?: string;
  cpa_url?: string;
};

export type AppConfig = {
  name: string;
  description: string;
  daily_limit: number;
  prompt: string;
  monetization: MonetizationRule[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
};

const configs: Record<string, AppConfig> = {
  "diy-repair": diyRepair as AppConfig,
  "kabi-diagnosis": kabiDiagnosis as AppConfig,
};

export function getConfig(appId: string): AppConfig | null {
  return configs[appId] ?? null;
}

export function listApps(): Array<{ id: string; name: string; description: string }> {
  return Object.entries(configs).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    description: cfg.description,
  }));
}
```

- [ ] **Step 5: テストが通ることを確認**

```bash
npx vitest run src/configs/index.test.ts
```

Expected: PASS (2 suites, 4 tests)

- [ ] **Step 6: コミット**

```bash
git add src/configs/
git commit -m "feat: add app config JSON files and loader"
```

---

## Task 4: 収益ロジック（monetization.ts）

**Files:**
- Create: `src/lib/monetization.ts`
- Create: `src/lib/monetization.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```typescript
// src/lib/monetization.test.ts
import { describe, it, expect } from "vitest";
import { applyMonetization } from "./monetization";
import type { MonetizationRule } from "../configs/index";

const ids = { amazonId: "testsite-22", rakutenId: "xxxx.xxxx" };

describe("applyMonetization", () => {
  it("affiliate rule: generates amazon and rakuten URLs", () => {
    const rules: MonetizationRule[] = [
      { condition: "default", type: "affiliate", keyword: "壁紙補修シール" },
    ];
    const result = applyMonetization({ damage_type: "壁紙破れ" }, rules, {}, ids);

    expect(result.monetization).toBeDefined();
    const m = result.monetization as Record<string, unknown>;
    expect(m.type).toBe("affiliate");
    expect(m.amazon_url).toContain("amazon.co.jp");
    expect(m.amazon_url).toContain("壁紙補修シール");
    expect(m.amazon_url).toContain("testsite-22");
    expect(m.rakuten_url).toContain("rakuten.co.jp");
  });

  it("cpa rule with condition: matches correctly", () => {
    const rules: MonetizationRule[] = [
      { condition: "category === '粗大ゴミ'", type: "cpa", cpa_url: "https://example.jp/?s=gomi" },
      { condition: "default", type: "adsense" },
    ];
    const result = applyMonetization({ category: "粗大ゴミ" }, rules, {}, ids);
    const m = result.monetization as Record<string, unknown>;
    expect(m.type).toBe("cpa");
    expect(m.cpa_url).toBe("https://example.jp/?s=gomi");
  });

  it("falls through to default when condition doesn't match", () => {
    const rules: MonetizationRule[] = [
      { condition: "category === '粗大ゴミ'", type: "cpa", cpa_url: "https://example.jp/" },
      { condition: "default", type: "adsense" },
    ];
    const result = applyMonetization({ category: "燃えるゴミ" }, rules, {}, ids);
    const m = result.monetization as Record<string, unknown>;
    expect(m.type).toBe("adsense");
  });

  it("template variable {{key}} is replaced from result", () => {
    const rules: MonetizationRule[] = [
      { condition: "default", type: "affiliate", keyword: "{{amazon_keyword}}" },
    ];
    const result = applyMonetization({ amazon_keyword: "補修マーカー" }, rules, {}, ids);
    const m = result.monetization as Record<string, unknown>;
    expect(m.amazon_url).toContain("補修マーカー");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/lib/monetization.test.ts
```

Expected: FAIL "Cannot find module './monetization'"

- [ ] **Step 3: monetization.tsを実装**

```typescript
// src/lib/monetization.ts
import type { MonetizationRule } from "../configs/index";

type MonetizationResult = {
  type: "affiliate" | "cpa" | "adsense";
  amazon_url: string | null;
  rakuten_url: string | null;
  cpa_url: string | null;
};

export function applyMonetization(
  result: Record<string, unknown>,
  rules: MonetizationRule[],
  context: Record<string, string>,
  ids: { amazonId: string; rakutenId: string }
): Record<string, unknown> & { monetization?: MonetizationResult } {
  const rule = rules.find((r) => {
    if (r.condition === "default") return true;
    const [field, , rawValue] = r.condition.split(" ");
    const value = rawValue.replace(/'/g, "");
    return String(result[field] ?? "") === value;
  });

  if (!rule) return result;

  const keyword = (rule.keyword ?? "").replace(
    /\{\{(\w+)\}\}/g,
    (_: string, k: string) => String(result[k] ?? context[k] ?? "")
  );

  const monetization: MonetizationResult = {
    type: rule.type,
    amazon_url:
      rule.type === "affiliate"
        ? `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${ids.amazonId}`
        : null,
    rakuten_url:
      rule.type === "affiliate"
        ? `https://hb.afl.rakuten.co.jp/hgc/${ids.rakutenId}/?pc=https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`
        : null,
    cpa_url: rule.cpa_url ?? null,
  };

  return { ...result, monetization };
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/lib/monetization.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: コミット**

```bash
git add src/lib/monetization.ts src/lib/monetization.test.ts
git commit -m "feat: add monetization logic with affiliate/cpa/adsense rules"
```

---

## Task 5: レートリミット（rate-limit.ts）

**Files:**
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/rate-limit.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```typescript
// src/lib/rate-limit.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { isRateLimited, clearCountsForTest } from "./rate-limit";

describe("isRateLimited", () => {
  beforeEach(() => clearCountsForTest());

  it("allows first request", async () => {
    expect(await isRateLimited("1.2.3.4", 5)).toBe(false);
  });

  it("allows up to limit", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await isRateLimited("1.2.3.4", 5)).toBe(false);
    }
  });

  it("blocks when limit exceeded", async () => {
    for (let i = 0; i < 5; i++) {
      await isRateLimited("1.2.3.4", 5);
    }
    expect(await isRateLimited("1.2.3.4", 5)).toBe(true);
  });

  it("different IPs are tracked separately", async () => {
    for (let i = 0; i < 5; i++) {
      await isRateLimited("1.2.3.4", 5);
    }
    expect(await isRateLimited("5.6.7.8", 5)).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/lib/rate-limit.test.ts
```

Expected: FAIL "Cannot find module './rate-limit'"

- [ ] **Step 3: rate-limit.tsを実装**

```typescript
// src/lib/rate-limit.ts
const counts = new Map<string, { count: number; date: string }>();

export async function isRateLimited(ip: string, limit: number): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;
  const entry = counts.get(key);

  if (!entry || entry.date !== today) {
    counts.set(key, { count: 1, date: today });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}

/** テスト専用：カウンターをリセット */
export function clearCountsForTest(): void {
  counts.clear();
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/lib/rate-limit.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: コミット**

```bash
git add src/lib/rate-limit.ts src/lib/rate-limit.test.ts
git commit -m "feat: add in-memory rate limiter"
```

---

## Task 6: Claude APIクライアント（claude.ts）

**Files:**
- Create: `src/lib/claude.ts`
- Create: `src/lib/claude.test.ts`

- [ ] **Step 1: 失敗テストを書く（fetchをモック）**

```typescript
// src/lib/claude.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { callClaude } from "./claude";

describe("callClaude", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls Claude API and returns parsed JSON from text content", async () => {
    const mockResponse = {
      content: [{ type: "text", text: '{"damage_type": "壁紙破れ", "damage_level": "軽微"}' }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => mockResponse,
      })
    );

    const result = await callClaude("test-key", "base64img", "診断して");
    expect(result).toEqual({ damage_type: "壁紙破れ", damage_level: "軽微" });
  });

  it("uses Haiku model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callClaude("test-key", "base64img", "診断して");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("claude-haiku-4-5");
  });

  it("sends prompt-caching header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callClaude("test-key", "base64img", "診断して");

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["anthropic-beta"]).toContain("prompt-caching");
  });

  it("retries on 529 and eventually succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 529, json: async () => ({}) })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ content: [{ type: "text", text: '{"ok": true}' }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callClaude("test-key", "base64img", "診断して");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10000);
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/lib/claude.test.ts
```

Expected: FAIL "Cannot find module './claude'"

- [ ] **Step 3: claude.tsを実装**

```typescript
// src/lib/claude.ts
const MODEL = "claude-haiku-4-5";

export async function callClaude(
  apiKey: string,
  imageBase64: string,
  prompt: string,
  maxRetries = 3
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: prompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
              },
              { type: "text", text: "上記の画像を診断してください。" },
            ],
          },
        ],
      }),
    });

    if (response.status === 529) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content.find((b) => b.type === "text")?.text ?? "{}";
    return JSON.parse(text.replace(/```json\n?|```\n?/g, "").trim());
  }
  throw new Error("Claude API unavailable after retries");
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/lib/claude.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: コミット**

```bash
git add src/lib/claude.ts src/lib/claude.test.ts
git commit -m "feat: add Claude Haiku API client with Prompt Caching and retry"
```

---

## Task 7: Pages Function（診断APIエンドポイント）

**Files:**
- Create: `src/pages/api/[appId]/analyze.ts`

テストはTask 4〜6のユニットテストで各ロジックをカバー済み。このタスクはPages Functionのルーティングと統合確認。

- [ ] **Step 1: ディレクトリを作成しanalyze.tsを実装**

```typescript
// src/pages/api/[appId]/analyze.ts
import type { APIRoute } from "astro";
import { getConfig } from "../../../configs/index";
import { callClaude } from "../../../lib/claude";
import { applyMonetization } from "../../../lib/monetization";
import { isRateLimited } from "../../../lib/rate-limit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS: APIRoute = () =>
  new Response(null, { headers: corsHeaders });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const appId = params.appId!;

  const config = getConfig(appId);
  if (!config) {
    return Response.json({ error: "App not found" }, { status: 404, headers: corsHeaders });
  }

  const env = (locals as App.Locals).runtime.env;

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (await isRateLimited(ip, config.daily_limit)) {
    return Response.json(
      { error: "Rate limit exceeded. Please try again tomorrow." },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: { image: string; context?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  const { image, context = {} } = body;
  if (!image) {
    return Response.json({ error: "image field is required" }, { status: 400, headers: corsHeaders });
  }

  const prompt = config.prompt.replace(
    /\{\{(\w+)\}\}/g,
    (_: string, key: string) => context[key] ?? ""
  );

  let diagnosisResult: Record<string, unknown>;
  try {
    diagnosisResult = await callClaude(env.ANTHROPIC_API_KEY, image, prompt);
  } catch {
    return Response.json(
      { error: "Diagnosis service temporarily unavailable" },
      { status: 503, headers: corsHeaders }
    );
  }

  const enriched = applyMonetization(
    diagnosisResult,
    config.monetization,
    context,
    { amazonId: env.AMAZON_ASSOCIATE_ID, rakutenId: env.RAKUTEN_AFFILIATE_ID }
  );

  return Response.json(enriched, { headers: corsHeaders });
};
```

- [ ] **Step 2: ローカルで動作確認（.dev.varsにAPIキーを設定済みの場合）**

```bash
npm run dev
# 別ターミナルで
curl -X POST http://localhost:4321/api/diy-repair/analyze \
  -H "Content-Type: application/json" \
  -d '{"image": "BASE64_IMAGE_HERE", "context": {}}'
```

Expected: `{"damage_type": "...", "damage_level": "...", "monetization": {...}}`

（APIキー未設定の場合は503が返ることを確認）

- [ ] **Step 3: 存在しないappIdで404が返ることを確認**

```bash
curl -X POST http://localhost:4321/api/unknown-app/analyze \
  -H "Content-Type: application/json" \
  -d '{"image": "test"}'
```

Expected: `{"error": "App not found"}` (status 404)

- [ ] **Step 4: コミット**

```bash
git add src/pages/api/
git commit -m "feat: add Pages Function API endpoint for image diagnosis"
```

---

## Task 8: Baseレイアウト

**Files:**
- Create: `src/layouts/Base.astro`

- [ ] **Step 1: Base.astroを作成**

```astro
---
// src/layouts/Base.astro
interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}

const {
  title,
  description = "AI画像診断で補修材・日用品を提案するWebアプリ＋使い方ガイド",
  ogImage = "/og/default.png",
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const adsenseId = import.meta.env.PUBLIC_ADSENSE_CLIENT_ID;
---

<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalURL} />

    <!-- OGP -->
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={new URL(ogImage, Astro.site).toString()} />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />

    <!-- AdSense審査用（設定されている場合のみ） -->
    {adsenseId && (
      <script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
        crossorigin="anonymous"
      />
    )}
  </head>
  <body>
    <header>
      <nav>
        <a href="/">AI診断ツール</a>
        <a href="/guide/">使い方ガイド</a>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer>
      <p>
        本サイトはAmazonアソシエイト・楽天アフィリエイト等のアフィリエイトプログラムに参加しています。
        記事内のリンクから商品を購入いただいた場合、報酬が発生することがあります。
      </p>
      <nav>
        <a href="/privacy/">プライバシーポリシー</a> |
        <a href="/terms/">利用規約</a> |
        <a href="/contact/">お問い合わせ</a> |
        <a href="/about/">運営者情報</a>
      </nav>
    </footer>
  </body>
</html>
```

- [ ] **Step 2: コミット**

```bash
git add src/layouts/Base.astro
git commit -m "feat: add Base layout with affiliate disclosure footer and AdSense hook"
```

---

## Task 9: ImageUploaderコンポーネント

**Files:**
- Create: `src/components/ImageUploader.tsx`

- [ ] **Step 1: ImageUploader.tsxを作成**

```tsx
// src/components/ImageUploader.tsx
import { useState, useRef } from "react";

type DiagnosisState =
  | { status: "idle" }
  | { status: "resizing" }
  | { status: "loading" }
  | { status: "done"; data: Record<string, unknown> }
  | { status: "error"; message: string };

interface Props {
  appId: string;
  context?: Record<string, string>;
  onResult: (data: Record<string, unknown>) => void;
}

async function resizeImage(file: File): Promise<string> {
  const MAX = 800;
  const img = await createImageBitmap(file);
  const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

async function getOrFetch(
  file: File,
  appId: string,
  context: Record<string, string>
): Promise<Record<string, unknown>> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hash = btoa(String.fromCharCode(...new Uint8Array(buf))).slice(0, 16);
  const cacheKey = `result:${appId}:${hash}`;

  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, ts } = JSON.parse(cached) as { data: Record<string, unknown>; ts: number };
    if (Date.now() - ts < 5 * 60 * 1000) return data;
  }

  const image = await resizeImage(file);
  const res = await fetch(`/api/${appId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, context }),
  });

  if (!res.ok) {
    const err = await res.json() as { error: string };
    throw new Error(err.error ?? "診断に失敗しました");
  }

  const data = await res.json() as Record<string, unknown>;
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  return data;
}

export default function ImageUploader({ appId, context = {}, onResult }: Props) {
  const [state, setState] = useState<DiagnosisState>({ status: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setState({ status: "resizing" });
    try {
      setState({ status: "loading" });
      const data = await getOrFetch(file, appId, context);
      setState({ status: "done", data });
      onResult(data);
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "不明なエラー" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      {preview && <img src={preview} alt="選択した画像" style={{ maxWidth: "300px" }} />}

      <button onClick={() => inputRef.current?.click()} disabled={state.status === "loading"}>
        {state.status === "loading" || state.status === "resizing"
          ? "診断中..."
          : "画像を選択して診断"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {state.status === "error" && (
        <p style={{ color: "red" }}>エラー: {state.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/ImageUploader.tsx
git commit -m "feat: add ImageUploader with client-side resize and session cache"
```

---

## Task 10: DiagnosisResultコンポーネント

**Files:**
- Create: `src/components/DiagnosisResult.tsx`

- [ ] **Step 1: DiagnosisResult.tsxを作成**

```tsx
// src/components/DiagnosisResult.tsx
interface Props {
  data: Record<string, unknown>;
  appId: string;
}

type ProductItem = {
  category: string;
  amazon_keyword: string;
  reason: string;
  priority: number;
};

export default function DiagnosisResult({ data, appId }: Props) {
  if (!data || Object.keys(data).length === 0) return null;

  const products = data.products as ProductItem[] | undefined;
  const tip = (data.diy_tip ?? data.prevention_tip) as string | undefined;

  return (
    <div>
      <h2>診断結果</h2>

      {/* アプリ別フィールド表示 */}
      {data.damage_type && <p>損傷タイプ: <strong>{String(data.damage_type)}</strong></p>}
      {data.damage_level && <p>程度: <strong>{String(data.damage_level)}</strong></p>}
      {data.mold_type && <p>カビの種類: <strong>{String(data.mold_type)}</strong></p>}
      {data.severity && <p>深刻度: <strong>{String(data.severity)}</strong></p>}
      {data.color_description && <p>色の特徴: {String(data.color_description)}</p>}

      {tip && (
        <div>
          <h3>アドバイス</h3>
          <p>{tip}</p>
        </div>
      )}

      {products && products.length > 0 && (
        <div>
          <h3>おすすめ商品</h3>
          <ul>
            {products.map((p, i) => (
              <li key={i}>
                <strong>{p.category}</strong>: {p.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/DiagnosisResult.tsx
git commit -m "feat: add DiagnosisResult component"
```

---

## Task 11: AffiliateBlockコンポーネント

**Files:**
- Create: `src/components/AffiliateBlock.tsx`

- [ ] **Step 1: AffiliateBlock.tsxを作成**

```tsx
// src/components/AffiliateBlock.tsx
type MonetizationData = {
  type: "affiliate" | "cpa" | "adsense";
  amazon_url: string | null;
  rakuten_url: string | null;
  cpa_url: string | null;
};

interface Props {
  monetization: MonetizationData;
}

export default function AffiliateBlock({ monetization }: Props) {
  if (!monetization) return null;

  if (monetization.type === "affiliate") {
    return (
      <div>
        <h3>おすすめ商品を探す</h3>
        <p>
          <small>
            ※ 以下はアフィリエイトリンクです。商品を購入いただいた場合、当サイトに報酬が発生します。
          </small>
        </p>
        <div>
          {monetization.amazon_url && (
            <a href={monetization.amazon_url} target="_blank" rel="noopener noreferrer">
              Amazonで探す
            </a>
          )}
          {monetization.rakuten_url && (
            <a href={monetization.rakuten_url} target="_blank" rel="noopener noreferrer">
              楽天市場で探す
            </a>
          )}
        </div>
      </div>
    );
  }

  if (monetization.type === "cpa" && monetization.cpa_url) {
    return (
      <div>
        <h3>無料見積もり・査定はこちら</h3>
        <a href={monetization.cpa_url} target="_blank" rel="noopener noreferrer">
          無料で相談する
        </a>
      </div>
    );
  }

  // adsenseの場合は何も表示しない（AdUnit.astroがレイアウト側で担当）
  return null;
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/AffiliateBlock.tsx
git commit -m "feat: add AffiliateBlock component for affiliate/CPA links"
```

---

## Task 12: 診断UIページ（[appId]/index.astro）

**Files:**
- Create: `src/pages/[appId]/index.astro`
- Create: `src/pages/[appId]/result/[uuid].astro`

- [ ] **Step 1: [appId]/index.astroを作成**

```astro
---
// src/pages/[appId]/index.astro
import Base from "../../layouts/Base.astro";
import ImageUploader from "../../components/ImageUploader";
import DiagnosisResult from "../../components/DiagnosisResult";
import AffiliateBlock from "../../components/AffiliateBlock";
import { getConfig, listApps } from "../../configs/index";

export async function getStaticPaths() {
  return listApps().map(({ id }) => ({ params: { appId: id } }));
}

const { appId } = Astro.params;
const config = getConfig(appId!);
if (!config) return Astro.redirect("/404");
---

<Base title={config.seo.title} description={config.seo.description}>
  <h1>{config.name}</h1>
  <p>{config.description}</p>

  <div id="diagnosis-app">
    <ImageUploader
      client:load
      appId={appId!}
      onResult={(data) => {
        window.__diagnosisResult = data;
        document.getElementById("result-section")?.removeAttribute("hidden");
      }}
    />

    <div id="result-section" hidden>
      <DiagnosisResult
        client:idle
        appId={appId!}
        data={{}}
      />
    </div>
  </div>

  <!-- 診断結果をクライアント側でレンダリング -->
  <script>
    window.__diagnosisResult = null;
    document.addEventListener("diagnosisComplete", (e) => {
      // ReactコンポーネントはImageUploaderのonResultで直接更新
    });
  </script>
</Base>
```

> **実装メモ**: 診断結果の受け渡しはReactの状態管理で行う。`ImageUploader`と`DiagnosisResult`を1つのReactコンポーネント（`DiagnosisApp`）にまとめると状態共有が簡単になる。以下のStep 2でリファクタリングする。

- [ ] **Step 2: DiagnosisAppコンテナを作成して状態を一元管理**

```tsx
// src/components/DiagnosisApp.tsx
import { useState } from "react";
import ImageUploader from "./ImageUploader";
import DiagnosisResult from "./DiagnosisResult";
import AffiliateBlock from "./AffiliateBlock";

type Monetization = {
  type: "affiliate" | "cpa" | "adsense";
  amazon_url: string | null;
  rakuten_url: string | null;
  cpa_url: string | null;
};

interface Props {
  appId: string;
  context?: Record<string, string>;
}

export default function DiagnosisApp({ appId, context = {} }: Props) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  return (
    <div>
      <ImageUploader appId={appId} context={context} onResult={setResult} />
      {result && (
        <>
          <DiagnosisResult data={result} appId={appId} />
          {result.monetization && (
            <AffiliateBlock monetization={result.monetization as Monetization} />
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: [appId]/index.astroをDiagnosisApp使用に更新**

```astro
---
// src/pages/[appId]/index.astro
import Base from "../../layouts/Base.astro";
import DiagnosisApp from "../../components/DiagnosisApp";
import { getConfig, listApps } from "../../configs/index";

export async function getStaticPaths() {
  return listApps().map(({ id }) => ({ params: { appId: id } }));
}

const { appId } = Astro.params;
const config = getConfig(appId!);
if (!config) return Astro.redirect("/404");
---

<Base title={config.seo.title} description={config.seo.description} ogImage={`/og/${appId}.png`}>
  <h1>{config.name}</h1>
  <p>{config.description}</p>
  <DiagnosisApp client:load appId={appId!} />
</Base>
```

- [ ] **Step 4: result/[uuid].astroを作成（シェア用ページ）**

```astro
---
// src/pages/[appId]/result/[uuid].astro
// 将来的にKVから結果を取得する想定。現在はURLパラメータから情報を表示する。
import Base from "../../../layouts/Base.astro";
import { getConfig, listApps } from "../../../configs/index";

export async function getStaticPaths() {
  // uuidは動的なのでSSR（server output）でレンダリング
  return [];
}

const { appId, uuid } = Astro.params;
const config = getConfig(appId!);
if (!config) return Astro.redirect("/404");
---

<Base title={`診断結果 | ${config.name}`}>
  <h1>診断結果</h1>
  <p>この結果はSNSでシェアされました。</p>
  <a href={`/${appId}/`}>もう一度診断する</a>
</Base>
```

- [ ] **Step 5: 動作確認**

```bash
npm run dev
# ブラウザで http://localhost:4321/diy-repair を開く
```

Expected: タイトル・説明・画像アップロードボタンが表示される。

- [ ] **Step 6: コミット**

```bash
git add src/components/DiagnosisApp.tsx src/pages/[appId]/
git commit -m "feat: add diagnosis UI page and DiagnosisApp container component"
```

---

## Task 13: トップページ（アプリ一覧）

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: index.astroを作成**

```astro
---
// src/pages/index.astro
import Base from "../layouts/Base.astro";
import { listApps } from "../configs/index";

const apps = listApps();
---

<Base
  title="AI画像診断ツール一覧"
  description="撮影するだけでAIが診断・おすすめ商品を提案する無料ツール集"
>
  <h1>AI画像診断ツール</h1>
  <p>画像を撮影するだけでAIが診断し、おすすめ商品を提案します。</p>

  <ul>
    {apps.map((app) => (
      <li>
        <a href={`/${app.id}/`}>
          <strong>{app.name}</strong>
          <span>{app.description}</span>
        </a>
      </li>
    ))}
  </ul>

  <section>
    <h2>使い方ガイド</h2>
    <p>DIY補修・カビ対策などの詳しい方法は<a href="/guide/">ガイド記事</a>をご覧ください。</p>
  </section>
</Base>
```

- [ ] **Step 2: コミット**

```bash
git add src/pages/index.astro
git commit -m "feat: add top page with app listing"
```

---

## Task 14: Content Collections設定 + ガイドページ

**Files:**
- Create: `src/content/config.ts`
- Create: `src/pages/guide/index.astro`
- Create: `src/pages/guide/[slug].astro`

- [ ] **Step 1: content/config.tsを作成**

```typescript
// src/content/config.ts
import { defineCollection, z } from "astro:content";

const guide = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.string(),
    tags: z.array(z.string()),
  }),
});

export const collections = { guide };
```

- [ ] **Step 2: guide/index.astroを作成**

```astro
---
// src/pages/guide/index.astro
import Base from "../../layouts/Base.astro";
import { getCollection } from "astro:content";

const articles = (await getCollection("guide")).sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
);
---

<Base
  title="DIY補修・日用品ガイド | AI診断ツール使い方"
  description="壁紙補修・カビ対策・タイヤチェックなどDIY・日用品の使い方ガイド記事一覧"
>
  <h1>使い方ガイド</h1>
  <ul>
    {articles.map((article) => (
      <li>
        <a href={`/guide/${article.slug}/`}>
          <strong>{article.data.title}</strong>
          <span>{article.data.description}</span>
          <time datetime={article.data.pubDate.toISOString()}>
            {article.data.pubDate.toLocaleDateString("ja-JP")}
          </time>
        </a>
      </li>
    ))}
  </ul>
</Base>
```

- [ ] **Step 3: guide/[slug].astroを作成**

```astro
---
// src/pages/guide/[slug].astro
import Base from "../../layouts/Base.astro";
import AdUnit from "../../components/AdUnit.astro";
import { getCollection, getEntry } from "astro:content";

export async function getStaticPaths() {
  const articles = await getCollection("guide");
  return articles.map((entry) => ({ params: { slug: entry.slug } }));
}

const { slug } = Astro.params;
const entry = await getEntry("guide", slug!);
if (!entry) return Astro.redirect("/404");

const { Content } = await entry.render();
---

<Base title={entry.data.title} description={entry.data.description}>
  <article>
    <h1>{entry.data.title}</h1>
    <time datetime={entry.data.pubDate.toISOString()}>
      {entry.data.pubDate.toLocaleDateString("ja-JP")}
    </time>

    <Content />

    <AdUnit />
  </article>

  <nav>
    <a href="/guide/">← 記事一覧に戻る</a>
  </nav>
</Base>
```

- [ ] **Step 4: コミット**

```bash
git add src/content/config.ts src/pages/guide/
git commit -m "feat: add Content Collections setup and guide pages"
```

---

## Task 15: SEO記事10本（MDX）

**Files:**
- Create: `src/content/guide/*.mdx` (10ファイル)

- [ ] **Step 1: 1本目を作成（wallpaper-repair.mdx）**

```mdx
---
title: "壁紙の破れ・剥がれ補修の方法とおすすめ商品【賃貸でも安心】"
description: "壁紙の破れ・剥がれを自分で補修する方法とおすすめ補修材の選び方を解説します。"
pubDate: 2026-03-30
category: "DIY補修"
tags: ["壁紙", "補修", "DIY", "賃貸"]
---

import AmazonLink from "../../components/AmazonLink.astro";

## 壁紙補修の基本：何が必要か

壁紙の破れや剥がれは、適切な補修材があれば自分で直せます。
補修の難易度は傷のサイズによって変わります。

- **5cm以下の小さな破れ**：壁紙補修シールで対応可能
- **5〜20cmの中程度の破れ**：補修用壁紙クロスと専用のり
- **20cm以上の大きな破れ**：専門業者への依頼を推奨

## 補修材の選び方

### 壁紙補修シール

小さな破れに最適です。白・ベージュ・グレーなど多様な色があります。

<AmazonLink keyword="壁紙補修シール">壁紙補修シールをAmazonで見る</AmazonLink>

### 補修用クロスのり

剥がれた壁紙を貼り直す際に使います。速乾タイプが作業しやすいです。

<AmazonLink keyword="壁紙 クロス のり 補修">壁紙補修のりをAmazonで見る</AmazonLink>

## 補修の手順

1. 補修箇所の汚れをきれいに拭き取る
2. 剥がれた部分の端を整える
3. 補修シールまたはのりを塗布する
4. 空気が入らないよう密着させる
5. 余分なのりをふき取り、24時間乾燥させる

## AIで補修材を診断する

傷を撮影するだけでAIが最適な補修材を提案します。

→ [AI補修診断ツールを使う](/diy-repair/)
```

- [ ] **Step 2: 残り9本を作成**

以下の骨格で各記事を作成。各記事に `<AmazonLink>` を2〜3箇所、末尾に関連診断ツールへの内部リンクを追加。

```
src/content/guide/flooring-scratch.mdx
  title: "フローリングの傷を自分で直す方法と補修マーカーの選び方"
  AmazonLink keywords: "フローリング 補修マーカー", "床 傷 補修 クレヨン"
  内部リンク: /diy-repair/

src/content/guide/black-mold-removal.mdx
  title: "黒カビの落とし方と最強洗剤の選び方【浴室・押入れ・壁】"
  AmazonLink keywords: "カビキラー 強力", "防カビ スプレー 浴室"
  内部リンク: /kabi-diagnosis/

src/content/guide/tire-check-timing.mdx
  title: "タイヤの溝チェック方法と交換時期の正しい判断基準"
  AmazonLink keywords: "タイヤ 溝 チェッカー", "タイヤ 交換 工具"
  内部リンク: /diy-repair/

src/content/guide/winter-tire-timing.mdx
  title: "冬タイヤへの交換時期はいつ？地域別・気温別の目安"
  AmazonLink keywords: "スタッドレスタイヤ 保管袋", "タイヤ 交換 ジャッキ"
  内部リンク: /diy-repair/

src/content/guide/floor-repair-paste.mdx
  title: "フローリング補修ペーストの使い方と失敗しない選び方"
  AmazonLink keywords: "フローリング 補修 パテ", "床 傷 補修 ペースト"
  内部リンク: /diy-repair/

src/content/guide/rental-wall-repair.mdx
  title: "賃貸退去前の壁穴補修｜敷金を守るDIY手順と注意点"
  AmazonLink keywords: "穴埋め パテ 壁", "壁 穴 補修 スプレー"
  内部リンク: /diy-repair/

src/content/guide/mold-prevention-spray.mdx
  title: "カビ防止スプレーのおすすめ比較【浴室・押入れ・クローゼット】"
  AmazonLink keywords: "防カビ スプレー おすすめ", "押入れ カビ 防止"
  内部リンク: /kabi-diagnosis/

src/content/guide/car-scratch-repair.mdx
  title: "車の小傷を自分で直すDIY補修グッズとやり方"
  AmazonLink keywords: "カーペイント タッチアップ", "車 傷 補修 セット"
  内部リンク: /diy-repair/

src/content/guide/wallpaper-repair-seal.mdx
  title: "壁紙補修シールの選び方と貼り方｜色合わせのコツ"
  AmazonLink keywords: "壁紙 補修シール 白", "クロス 補修 シール"
  内部リンク: /diy-repair/
```

- [ ] **Step 3: `npm run dev` でガイドページが表示されることを確認**

```bash
npm run dev
# ブラウザで http://localhost:4321/guide/ を開く
```

Expected: 10記事のリストが表示される。

- [ ] **Step 4: コミット**

```bash
git add src/content/guide/
git commit -m "feat: add 10 SEO guide articles in MDX"
```

---

## Task 16: AmazonLinkコンポーネント

**Files:**
- Create: `src/components/AmazonLink.astro`

- [ ] **Step 1: AmazonLink.astroを作成**

```astro
---
// src/components/AmazonLink.astro
interface Props {
  keyword: string;
}

const { keyword } = Astro.props;
const associateId = import.meta.env.PUBLIC_AMAZON_ASSOCIATE_ID ?? "yoursite-22";
const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${associateId}`;
---

<a href={url} target="_blank" rel="noopener noreferrer">
  <slot />
</a>
```

- [ ] **Step 2: コミット**

```bash
git add src/components/AmazonLink.astro
git commit -m "feat: add AmazonLink component for MDX articles"
```

---

## Task 17: 必須ページ（privacy / terms / contact / about）

**Files:**
- Create: `src/pages/privacy.astro`
- Create: `src/pages/terms.astro`
- Create: `src/pages/contact.astro`
- Create: `src/pages/about.astro`

- [ ] **Step 1: privacy.astroを作成**

```astro
---
// src/pages/privacy.astro
import Base from "../layouts/Base.astro";
const today = new Date("2026-03-30").toLocaleDateString("ja-JP");
---

<Base title="プライバシーポリシー" description="当サイトのプライバシーポリシーです">
  <h1>プライバシーポリシー</h1>
  <p>制定日: {today}</p>

  <h2>アフィリエイトプログラムへの参加</h2>
  <p>
    当サイトはAmazonアソシエイト・プログラムに参加しています。
    Amazonのアソシエイトとして、当サイトは適格販売によって収入を得ています。
    また、楽天アフィリエイト、A8.net、もしもアフィリエイト、ValueCommerce、
    アクセストレードが提供するアフィリエイトプログラムにも参加しています。
  </p>

  <h2>広告の配信</h2>
  <p>
    当サイトはGoogle AdSenseを使用しています。Googleはcookieを使用して、
    ユーザーが以前にこのサイトや他のサイトにアクセスした際の情報に基づいて広告を配信します。
  </p>

  <h2>アクセス解析</h2>
  <p>
    当サイトはCloudflare Analyticsを使用しています。
    収集する情報はIPアドレス、ブラウザの種類、参照元URLなどです。
    個人を特定する情報は収集しません。
  </p>

  <h2>画像データの取扱い</h2>
  <p>
    AI診断のために投稿いただいた画像は、診断処理のみに使用し、
    サーバーへの保存は行いません。診断完了後に即時破棄されます。
  </p>

  <h2>お問い合わせ</h2>
  <p>プライバシーポリシーに関するご質問は<a href="/contact/">お問い合わせページ</a>からご連絡ください。</p>
</Base>
```

- [ ] **Step 2: terms.astroを作成**

```astro
---
// src/pages/terms.astro
import Base from "../layouts/Base.astro";
---

<Base title="利用規約" description="当サイトの利用規約です">
  <h1>利用規約</h1>

  <h2>サービスの内容</h2>
  <p>
    当サイトのAI診断サービスは参考情報の提供を目的としています。
    診断結果は医療的診断、法的判断、専門家の意見に代わるものではありません。
  </p>

  <h2>画像データの取扱い</h2>
  <p>
    投稿された画像はAI診断の処理にのみ使用し、サーバーへの保存は行いません。
    個人情報（顔写真、氏名が映った書類等）が含まれる画像のアップロードはお控えください。
  </p>

  <h2>診断結果の免責</h2>
  <p>
    AI診断結果の正確性を保証しません。
    実際の補修・処置・購入判断は必ずご自身の判断で行ってください。
    当サイトの診断結果を利用して生じた損害について、当サイトは責任を負いません。
  </p>

  <h2>食品・生物に関する免責</h2>
  <p>
    食品・キノコ・植物等の食用可否に関する診断結果は参考情報です。
    食中毒・中毒等の事故については当サイトは一切責任を負いません。
    専門家や公的機関の判断に従ってください。
  </p>

  <h2>外部リンクの免責</h2>
  <p>
    当サイトからリンクされているAmazon・楽天市場等の外部サイトの内容について、
    当サイトは責任を負いません。
  </p>
</Base>
```

- [ ] **Step 3: contact.astroとabout.astroを作成**

```astro
---
// src/pages/contact.astro
import Base from "../layouts/Base.astro";
---
<Base title="お問い合わせ" description="当サイトへのお問い合わせ">
  <h1>お問い合わせ</h1>
  <p>ご質問・ご要望は以下のメールアドレスまでお送りください。</p>
  <p>メール: <a href="mailto:contact@example.com">contact@example.com</a></p>
  <p>※ 返信まで数日いただく場合があります。</p>
</Base>
```

```astro
---
// src/pages/about.astro
import Base from "../layouts/Base.astro";
---
<Base title="運営者情報" description="当サイトの運営者情報">
  <h1>運営者情報</h1>
  <table>
    <tr><th>運営者</th><td>個人運営</td></tr>
    <tr><th>所在地</th><td>東京都</td></tr>
    <tr><th>設立</th><td>2026年</td></tr>
    <tr><th>事業内容</th><td>AI画像診断Webサービスの運営・アフィリエイト</td></tr>
    <tr><th>お問い合わせ</th><td><a href="/contact/">お問い合わせページ</a></td></tr>
  </table>
</Base>
```

- [ ] **Step 4: コミット**

```bash
git add src/pages/privacy.astro src/pages/terms.astro src/pages/contact.astro src/pages/about.astro
git commit -m "feat: add required pages for affiliate review (privacy/terms/contact/about)"
```

---

## Task 18: AdUnitコンポーネント

**Files:**
- Create: `src/components/AdUnit.astro`

- [ ] **Step 1: AdUnit.astroを作成**

```astro
---
// src/components/AdUnit.astro
// AdSense審査通過後にins要素のコメントアウトを解除する
const adsenseId = import.meta.env.PUBLIC_ADSENSE_CLIENT_ID;
---

{adsenseId && (
  <div>
    <!-- AdSense承認後に以下のコメントアウトを解除し、data-ad-slotを設定する -->
    <!--
    <ins
      class="adsbygoogle"
      style="display:block"
      data-ad-client={adsenseId}
      data-ad-slot="XXXXXXXXXX"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    -->
  </div>
)}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/AdUnit.astro
git commit -m "feat: add AdUnit component (inactive until AdSense approval)"
```

---

## Task 19: 静的OGP画像を用意

**Files:**
- Create: `public/og/default.png`
- Create: `public/og/diy-repair.png`
- Create: `public/og/kabi-diagnosis.png`

- [ ] **Step 1: OGP画像を作成**

各アプリ用の静的OGP画像（1200×630px）を用意する。

以下のツールを使って作成:
- Canva（無料テンプレートあり）
- またはClaude Codeで簡単なSVGを作成してPNGに変換

最低限必要な内容（アプリ名 + サイトURL）：

```
diy-repair.png: 「DIY補修診断」「画像を撮影するだけで補修材を提案」
kabi-diagnosis.png: 「カビ診断」「カビの種類と対処法をAIが診断」
default.png: 「AI画像診断ツール」「example.com」
```

> **Claude Codeで生成する場合:**
> ```bash
> claude "1200×630pxのOGP画像を3枚作成してください。
> public/og/diy-repair.png, kabi-diagnosis.png, default.png
> 白背景、アプリ名（大文字）、サイトURL（小）のシンプルデザイン。
> node-canvasかpuppeteerで生成するスクリプトを書いてください"
> ```

- [ ] **Step 2: コミット**

```bash
git add public/og/
git commit -m "feat: add static OGP images for each app"
```

---

## Task 20: Cloudflare Pagesにデプロイ

**Files:**
- なし（設定はダッシュボードで行う）

- [ ] **Step 1: GitHubにpush**

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-diagnosis-platform.git
git push -u origin main
```

- [ ] **Step 2: Cloudflare PagesにGitHub連携でデプロイ**

```
1. https://pages.cloudflare.com にアクセス
2. 「Create a project」→「Connect to Git」→ リポジトリを選択
3. Build settings:
   - Framework preset: Astro
   - Build command: npm run build
   - Build output directory: dist
4. 「Save and Deploy」
```

- [ ] **Step 3: Cloudflare PagesでシークレットをEnvironment Variablesに設定**

```
Settings → Environment Variables → Production:

ANTHROPIC_API_KEY      = sk-ant-XXXXXXXXXXXXXXXX
AMAZON_ASSOCIATE_ID    = yoursite-22
RAKUTEN_AFFILIATE_ID   = xxxxxxxx.xxxxxxxx
```

- [ ] **Step 4: デプロイ成功を確認**

```
□ https://your-project.pages.dev/ でトップページが表示される
□ https://your-project.pages.dev/guide/ で記事一覧が表示される
□ https://your-project.pages.dev/diy-repair/ で診断ページが表示される
□ https://your-project.pages.dev/privacy/ でプライバシーポリシーが表示される
```

- [ ] **Step 5: カスタムドメインを設定**

```
Cloudflare Pages → Custom Domains → Add a domain
→ example.com を設定
```

---

## Task 21: 全テストが通ることを確認

- [ ] **Step 1: 全ユニットテストを実行**

```bash
npx vitest run
```

Expected:
```
✓ src/configs/index.test.ts (4 tests)
✓ src/lib/monetization.test.ts (4 tests)
✓ src/lib/rate-limit.test.ts (4 tests)
✓ src/lib/claude.test.ts (4 tests)
Total: 16 tests passed
```

- [ ] **Step 2: ビルドが通ることを確認**

```bash
npm run build
```

Expected: `dist/` が生成されエラーなし。

- [ ] **Step 3: コミット**

```bash
git add .
git commit -m "chore: verify all tests pass and build succeeds"
```

---

## Task 22: 2本目のアプリを設定追加で追加（Phase 5確認）

**Files:**
- Modify: `src/configs/index.ts`（1行追加のみ）

- [ ] **Step 1: index.tsに kabi-diagnosis を追加（既に作成済みのJSONを使う）**

```typescript
// src/configs/index.ts の configs オブジェクトに追加
const configs: Record<string, AppConfig> = {
  "diy-repair": diyRepair as AppConfig,
  "kabi-diagnosis": kabiDiagnosis as AppConfig,  // ← この行を追加
};
```

- [ ] **Step 2: トップページに新アプリが表示されることを確認**

```bash
npm run dev
# http://localhost:4321/ を開く
```

Expected: 「DIY補修診断」「カビ診断」の2つが表示される。

- [ ] **Step 3: /kabi-diagnosis/ で診断ページが動くことを確認**

```bash
# ブラウザで http://localhost:4321/kabi-diagnosis/ を開く
```

Expected: カビ診断のUIが表示される。

- [ ] **Step 4: コミット**

```bash
git add src/configs/index.ts
git commit -m "feat: add kabi-diagnosis app via config only (no code change)"
```

---

## チェックリスト（完了条件）

```
□ npm run build がエラーなし
□ npx vitest run が全16テストパス
□ Cloudflare Pagesにデプロイ済み・公開状態
□ https://example.com/guide/ に10記事が表示される
□ https://example.com/diy-repair/ で画像アップロード→診断が動く
□ https://example.com/kabi-diagnosis/ が設定追加のみで動く
□ /privacy/ /terms/ /contact/ /about/ が全て表示される
□ フッターにアフィリエイト表示が全ページに出る
□ AdSenseコードが全ページの<head>に埋め込まれている（設定時のみ）
□ ANTHROPIC_API_KEYがCloudflareシークレットに設定済み
```

---

*実装計画版: 2026-03-30 | 対応スペック: HANDOFF.md (Approach A)*
