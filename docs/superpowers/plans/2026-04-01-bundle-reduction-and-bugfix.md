# Bundle Reduction & Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Worker bundle を 3 MiB 以下に収めデプロイを成功させ、発見した全バグを修正する

**Architecture:**
- `emptyOutDir: true` でクリーンビルドを強制し、staleファイル蓄積を防止（最重要）
- 静的ページに `export const prerender = true` を付与し、ReactSSRをWorkerバンドルから除去
- 3つのバグ（monetizationテンプレート、cloudJSON.parse、ImageUploaderメモリリーク）を個別に修正

**Tech Stack:** Astro 6.1.1, Cloudflare Workers, React 19, TypeScript, Vitest

---

## ファイル変更マップ

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `astro.config.mjs` | Modify | `emptyOutDir: false` → `true` |
| `src/pages/index.astro` | Modify | `export const prerender = true` 追加 |
| `src/pages/[appId]/index.astro` | Modify | `export const prerender = true` 追加、`getStaticPaths` 整理 |
| `src/pages/about.astro` | Modify | `export const prerender = true` 追加 |
| `src/pages/privacy.astro` | Modify | `export const prerender = true` 追加 |
| `src/pages/terms.astro` | Modify | `export const prerender = true` 追加 |
| `src/pages/contact.astro` | Modify | `export const prerender = true` 追加 |
| `src/pages/404.astro` | Modify | `export const prerender = true` 追加 |
| `src/pages/[appId]/result/[uuid].astro` | Modify | 空の `getStaticPaths` 削除 |
| `src/lib/monetization.ts` | Modify | テンプレートリゾルバを nested path 対応に修正 |
| `src/lib/monetization.test.ts` | Modify | `{{products[0].amazon_keyword}}` テスト追加 |
| `src/lib/claude.ts` | Modify | `JSON.parse` を try/catch で囲む |
| `src/lib/claude.test.ts` | Modify | 非JSONレスポンス時のテスト追加 |
| `src/components/ImageUploader.tsx` | Modify | URLメモリリーク修正、canvas null安全性 |

---

## Task 1: emptyOutDir を true に変更（最重要）

**背景:** `emptyOutDir: false` により古いビルド成果物が蓄積し、Wrangler が `no_bundle: true` で全ファイルをアップロードするため 16 MB になっていた。最新ビルドのみなら ~1.05 MB で 3 MiB 制限内。

**Files:**
- Modify: `astro.config.mjs`

- [ ] **Step 1: astro.config.mjs を編集**

`vite.build.emptyOutDir: false` を `true` に変更する。

変更前:
```js
vite: {
  build: {
    emptyOutDir: false,
  },
},
```

変更後:
```js
vite: {
  build: {
    emptyOutDir: true,
  },
},
```

- [ ] **Step 2: 既存の dist/server をクリーンアップ**

```bash
rm -rf dist/
```

- [ ] **Step 3: ビルドして成果物サイズを確認**

```bash
npm run build
ls -lah dist/server/chunks/ | sort -k5 -rh | head -20
du -sh dist/server/
```

期待する結果: `dist/server/` が 1.5 MB 以下、`chunks/` に旧ビルドファイルなし

- [ ] **Step 4: コミット**

```bash
git add astro.config.mjs
git commit -m "fix: emptyOutDir true でクリーンビルド強制、staleアーティファクト蓄積を防止"
```

---

## Task 2: 静的ページに prerender ディレクティブを追加

**背景:** 現在 `output: "server"` で全ページSSRされており、React SSR コードがWorkerバンドルに含まれる。静的ページをprerenderすることでWorkerが軽量化される。guide系ページは既に `prerender = true` 設定済み。

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/[appId]/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/privacy.astro`
- Modify: `src/pages/terms.astro`
- Modify: `src/pages/contact.astro`
- Modify: `src/pages/404.astro`
- Modify: `src/pages/[appId]/result/[uuid].astro`

- [ ] **Step 1: index.astro に prerender を追加**

`src/pages/index.astro` のフロントマター先頭（`---` の直後）に追記:
```astro
---
export const prerender = true;
import Base from "../layouts/Base.astro";
import { listApps } from "../configs/index";
// 以下は既存のままで変更不要
```

- [ ] **Step 2: [appId]/index.astro を更新**

このページは appId が build time に確定するため prerender 可能。`getStaticPaths` は prerender 時のみ有効で、SSRモードでは無視されていた（無害だが混乱の原因）。`prerender = true` を追加し、`getStaticPaths` を有効化する。

`src/pages/[appId]/index.astro` のフロントマターを以下に変更:
```astro
---
export const prerender = true;

import Base from "../../layouts/Base.astro";
import DiagnosisApp from "../../components/DiagnosisApp";
import { getConfig, listApps } from "../../configs/index";

export async function getStaticPaths() {
  return listApps().map(({ id }) => ({ params: { appId: id } }));
}

const { appId } = Astro.params;
const config = getConfig(appId!);
if (!config) return Astro.redirect("/404");

const appMeta: Record<string, { icon: string; iconBg: string }> = {
  "diy-repair":     { icon: "🔨", iconBg: "icon-bg-orange" },
  "kabi-diagnosis": { icon: "🔬", iconBg: "icon-bg-green" },
};
const meta = appMeta[appId!] ?? { icon: "🔍", iconBg: "icon-bg-blue" };
---
```

- [ ] **Step 3: about.astro に prerender を追加**

`src/pages/about.astro` のフロントマター先頭に追記:
```astro
---
export const prerender = true;
import Base from "../layouts/Base.astro";
---
```

- [ ] **Step 4: privacy.astro に prerender を追加**

`src/pages/privacy.astro` のフロントマター先頭に追記:
```astro
---
export const prerender = true;
import Base from "../layouts/Base.astro";
const today = new Date("2026-03-30").toLocaleDateString("ja-JP");
---
```

- [ ] **Step 5: terms.astro に prerender を追加**

`src/pages/terms.astro` を読んでフロントマター先頭に `export const prerender = true;` を追加する（既存のimportより前）。

- [ ] **Step 6: contact.astro に prerender を追加**

`src/pages/contact.astro` を読んでフロントマター先頭に `export const prerender = true;` を追加する（既存のimportより前）。

- [ ] **Step 7: 404.astro に prerender を追加**

`src/pages/404.astro` を読んでフロントマター先頭に `export const prerender = true;` を追加する（既存のimportより前）。

- [ ] **Step 8: result/[uuid].astro の空 getStaticPaths を削除**

`src/pages/[appId]/result/[uuid].astro` から以下を削除（SSRのまま維持、空の getStaticPaths は混乱の原因）:
```astro
export async function getStaticPaths() {
  return [];
}
```

削除後のフロントマター:
```astro
---
import Base from "../../../layouts/Base.astro";
import { getConfig } from "../../../configs/index";

const { appId, uuid } = Astro.params;
const config = getConfig(appId!);
if (!config) return Astro.redirect("/404");
---
```

- [ ] **Step 9: ビルドしてサイズと静的出力を確認**

```bash
npm run build
ls dist/client/                   # index.html, diy-repair/, kabi-diagnosis/ 等が生成されること
ls dist/client/diy-repair/        # index.html があること
du -sh dist/server/
ls -lah dist/server/chunks/ | sort -k5 -rh | head -10
```

期待する結果:
- `dist/client/` に静的 HTML が生成される
- `dist/server/chunks/` に `index_*.mjs`, `privacy_*.mjs`, `about_*.mjs` 等がなくなる（プリレンダリングされたため）
- Worker バンドルがさらに小さくなる

- [ ] **Step 10: コミット**

```bash
git add src/pages/
git commit -m "perf: 静的ページを prerender=true でビルド時生成に変更、Workerバンドル削減"
```

---

## Task 3: monetization テンプレートリゾルバのバグ修正（Critical）

**背景:** `{{products[0].amazon_keyword}}` のテンプレートが regex `/\{\{(\w+)\}\}/g` にマッチしない。`[`, `.` は `\w` に含まれないため、テンプレートが未解決のままAmazon URLに入り込む（例: `?k=%7B%7Bproducts%5B0%5D...%7D%7D`）。

**Files:**
- Modify: `src/lib/monetization.ts`
- Modify: `src/lib/monetization.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/monetization.test.ts` の既存テストに追加（`describe` ブロック内）:

```typescript
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
  expect((result.monetization as { amazon_url: string }).amazon_url).toContain(
    encodeURIComponent("壁紙補修テープ")
  );
  expect((result.monetization as { amazon_url: string }).amazon_url).not.toContain("%7B");
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 5 "products\[0\]"
```

期待: FAIL（現在のリゾルバはネストパスを解決できない）

- [ ] **Step 3: monetization.ts を修正**

`src/lib/monetization.ts` を以下に置き換える:

```typescript
import type { MonetizationRule } from "../configs/index";

type MonetizationResult = {
  type: "affiliate" | "cpa" | "adsense";
  amazon_url: string | null;
  rakuten_url: string | null;
  cpa_url: string | null;
};

/** "products[0].amazon_keyword" のようなパス式をオブジェクトから解決する */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  return parts.reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

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

  const merged = { ...result, ...Object.fromEntries(Object.entries(context)) };
  const keyword = (rule.keyword ?? "").replace(
    /\{\{([^}]+)\}\}/g,
    (_: string, path: string) => String(resolvePath(merged, path.trim()) ?? "")
  );

  const monetization: MonetizationResult = {
    type: rule.type,
    amazon_url:
      rule.type === "affiliate" && keyword
        ? `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${ids.amazonId}`
        : null,
    rakuten_url:
      rule.type === "affiliate" && keyword
        ? `https://hb.afl.rakuten.co.jp/hgc/${ids.rakutenId}/?pc=https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`
        : null,
    cpa_url: rule.cpa_url ?? null,
  };

  return { ...result, monetization };
}
```

- [ ] **Step 4: テストを実行して通過を確認**

```bash
npm test
```

期待: 全 17 テスト以上 PASS（既存テストが壊れていないこと含む）

- [ ] **Step 5: コミット**

```bash
git add src/lib/monetization.ts src/lib/monetization.test.ts
git commit -m "fix: monetization テンプレートリゾルバを products[0].key 形式のネストパスに対応"
```

---

## Task 4: claude.ts の JSON.parse エラーハンドリング

**背景:** Claudeが非JSONテキスト（断り文句、マークダウン混入等）を返した場合、`JSON.parse` が throw し、analyze.ts の catch ブロックで 503 が返される。現状は動作するが、エラーメッセージが分かりにくい。明示的に catch してログを出す。

**Files:**
- Modify: `src/lib/claude.ts`
- Modify: `src/lib/claude.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/claude.test.ts` の既存テストに追加:

```typescript
it("Claude が非JSONテキストを返した場合に Error を throw する", async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: "text", text: "申し訳ありませんが、この画像は診断できません。" }],
    }),
  });
  vi.stubGlobal("fetch", mockFetch);

  await expect(callClaude("test-key", "base64data", "診断してください")).rejects.toThrow(
    "Claude returned non-JSON response"
  );

  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 5 "非JSON"
```

期待: FAIL（現在は `JSON.parse` の生エラーが throw される）

- [ ] **Step 3: claude.ts の JSON.parse を修正**

`src/lib/claude.ts` の該当行を変更:

変更前（57行目付近）:
```typescript
const text = data.content.find((b) => b.type === "text")?.text ?? "{}";
return JSON.parse(text.replace(/```json\n?|```\n?/g, "").trim());
```

変更後:
```typescript
const text = data.content.find((b) => b.type === "text")?.text ?? "{}";
const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
try {
  return JSON.parse(cleaned);
} catch {
  throw new Error(`Claude returned non-JSON response: ${cleaned.slice(0, 100)}`);
}
```

- [ ] **Step 4: テストを実行して通過を確認**

```bash
npm test
```

期待: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/claude.ts src/lib/claude.test.ts
git commit -m "fix: Claude が非JSON返却時に明示的なエラーメッセージを throw"
```

---

## Task 5: ImageUploader のメモリリークと null 安全性を修正

**背景:**
1. `URL.createObjectURL(file)` で作成した ObjectURL が `revokeObjectURL` されずメモリリーク
2. `canvas.getContext("2d")!` の非null アサーションが環境によって null になりうる

**Files:**
- Modify: `src/components/ImageUploader.tsx`

- [ ] **Step 1: useEffect を import に追加**

`src/components/ImageUploader.tsx` の先頭 import 行を確認し、`useEffect` を追加する:

```typescript
import { useState, useRef, useCallback, useEffect } from "react";
```

- [ ] **Step 2: canvas.getContext の null チェックを追加**

`resizeImage` 関数内の該当行を変更:

変更前:
```typescript
canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
```

変更後:
```typescript
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Canvas 2D context unavailable");
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
```

- [ ] **Step 3: ObjectURL のクリーンアップを追加**

`handleFile` 関数の前に `useEffect` を追加してクリーンアップする。`preview` state の変更を監視してrevokeする:

```typescript
// preview が変わるたびに古い ObjectURL を破棄
useEffect(() => {
  return () => {
    if (preview) URL.revokeObjectURL(preview);
  };
}, [preview]);
```

このコードブロックは `const [isDragging, setIsDragging] = useState(false);` の直後に配置する。

- [ ] **Step 4: ビルドエラーがないことを確認**

```bash
npm run build 2>&1 | tail -5
```

期待: `✓ Completed` でエラーなし

- [ ] **Step 5: コミット**

```bash
git add src/components/ImageUploader.tsx
git commit -m "fix: ImageUploader の ObjectURL メモリリーク修正と canvas.getContext null 安全性改善"
```

---

## Task 6: 型チェック・テスト・ビルド・デプロイ

- [ ] **Step 1: 型チェック**

```bash
npx astro check 2>&1 | tail -20
```

期待: エラーなし（警告は可）

- [ ] **Step 2: テスト全実行**

```bash
npm test
```

期待: 全テスト PASS（17件以上）

- [ ] **Step 3: クリーンビルド**

`emptyOutDir: true` になっているため clean build が自動で行われる:

```bash
npm run build 2>&1 | tail -10
```

期待: `✓ Completed` でエラーなし

- [ ] **Step 4: バンドルサイズ確認**

```bash
du -sh dist/server/
ls -lah dist/server/chunks/ | sort -k5 -rh | head -10
```

期待:
- `dist/server/` が 1.5 MB 以下
- 単一の `worker-entry_*.mjs`（~600-980 KB）
- 旧ビルドのファイルなし

- [ ] **Step 5: デプロイ**

```bash
npx wrangler deploy --config dist/server/wrangler.json 2>&1 | tail -10
```

期待: `Deployed satsu-tei` または類似の成功メッセージ

- [ ] **Step 6: 動作確認**

ブラウザで以下を確認:
1. `https://satsu-tei.com/` が表示される
2. `https://satsu-tei.com/diy-repair/` で診断ページが表示される
3. 画像をアップロードして診断が成功する
4. 診断結果の Amazon URL が `k=壁紙補修テープ` のように実際のキーワードになっている（URLデコードして確認）

- [ ] **Step 7: progress.md を更新**

`C:\tool\claude\ai-diagnosis-platform\.claude\progress.md` の「次セッションでやること」を更新:

```markdown
## 完了（2026-04-01）
- Bundle 削減（emptyOutDir true + prerender）✅
- monetization テンプレートバグ修正 ✅
- claude.ts JSON.parse エラーハンドリング ✅
- ImageUploader メモリリーク修正 ✅
- デプロイ成功 ✅
```

- [ ] **Step 8: 最終コミット**

```bash
git add .claude/progress.md
git commit -m "chore: progress.md を Bundle削減・バグ修正完了で更新"
```
