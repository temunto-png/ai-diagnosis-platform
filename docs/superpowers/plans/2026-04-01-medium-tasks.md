# Medium Tasks (M1–M4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schema.org構造化マークアップ・404ページ・記事公開日分散・E-E-A-T強化を一括実装し、SEOとUXを改善する。

**Architecture:** SchemaOrg.astroコンポーネントを新規作成してBase.astroのhead slotで記事ページに注入する。404ページはAstroの規約に従い`src/pages/404.astro`として作成する。記事公開日はMDX frontmatterを直接編集する。

**Tech Stack:** Astro 6.1.1、Cloudflare Workers、TypeScript、Vitest（既存テストの確認のみ）

---

## ファイルマップ

| ファイル | 変更種別 | 責務 |
|---------|---------|------|
| `src/components/SchemaOrg.astro` | 新規作成 | JSON-LD出力（Organization / Article / BreadcrumbList） |
| `src/pages/404.astro` | 新規作成 | 404エラーページ（Base.astroレイアウト使用） |
| `src/layouts/Base.astro` | 修正 | head slotの追加・authorメタタグ追加・SchemaOrg組み込み |
| `src/pages/guide/[slug].astro` | 修正 | SchemaOrg article注入・E-E-A-Tバッジ追加 |
| `src/content/guide/black-mold-removal.mdx` | 修正 | pubDate変更 |
| `src/content/guide/car-scratch-repair.mdx` | 修正 | pubDate変更 |
| `src/content/guide/floor-repair-paste.mdx` | 修正 | pubDate変更 |
| `src/content/guide/flooring-scratch.mdx` | 修正 | pubDate変更 |
| `src/content/guide/mold-prevention-spray.mdx` | 修正 | pubDate変更 |
| `src/content/guide/rental-wall-repair.mdx` | 修正 | pubDate変更 |
| `src/content/guide/wallpaper-repair-seal.mdx` | 修正 | pubDate変更 |
| `src/content/guide/wallpaper-repair.mdx` | 修正 | pubDate変更 |
| `src/content/guide/tire-check-timing.mdx` | 修正 | pubDate変更 |
| `src/content/guide/winter-tire-timing.mdx` | 修正 | pubDate変更 |

---

## Task 1: M3 — ガイド記事公開日の分散

**Files:**
- Modify: `src/content/guide/black-mold-removal.mdx`
- Modify: `src/content/guide/car-scratch-repair.mdx`
- Modify: `src/content/guide/floor-repair-paste.mdx`
- Modify: `src/content/guide/flooring-scratch.mdx`
- Modify: `src/content/guide/mold-prevention-spray.mdx`
- Modify: `src/content/guide/rental-wall-repair.mdx`
- Modify: `src/content/guide/wallpaper-repair-seal.mdx`
- Modify: `src/content/guide/wallpaper-repair.mdx`
- Modify: `src/content/guide/tire-check-timing.mdx`
- Modify: `src/content/guide/winter-tire-timing.mdx`

- [x] **Step 1: 各MDXのpubDateを変更する**

各ファイルの frontmatter `pubDate: 2026-03-30` を以下の値に変更する。

`black-mold-removal.mdx`:
```
pubDate: 2026-03-22
```

`car-scratch-repair.mdx`:
```
pubDate: 2026-02-28
```

`floor-repair-paste.mdx`:
```
pubDate: 2026-02-15
```

`flooring-scratch.mdx`:
```
pubDate: 2026-01-25
```

`mold-prevention-spray.mdx`:
```
pubDate: 2026-01-10
```

`rental-wall-repair.mdx`:
```
pubDate: 2025-12-20
```

`wallpaper-repair-seal.mdx`:
```
pubDate: 2025-12-05
```

`wallpaper-repair.mdx`:
```
pubDate: 2025-11-18
```

`tire-check-timing.mdx`:
```
pubDate: 2025-11-03
```

`winter-tire-timing.mdx`:
```
pubDate: 2025-10-15
```

- [x] **Step 2: 変更を確認する**

```bash
grep "pubDate:" src/content/guide/*.mdx
```

期待出力（全て異なる日付）:
```
src/content/guide/black-mold-removal.mdx:pubDate: 2026-03-22
src/content/guide/car-scratch-repair.mdx:pubDate: 2026-02-28
src/content/guide/floor-repair-paste.mdx:pubDate: 2026-02-15
src/content/guide/flooring-scratch.mdx:pubDate: 2026-01-25
src/content/guide/mold-prevention-spray.mdx:pubDate: 2026-01-10
src/content/guide/rental-wall-repair.mdx:pubDate: 2025-12-20
src/content/guide/tire-check-timing.mdx:pubDate: 2025-11-03
src/content/guide/wallpaper-repair-seal.mdx:pubDate: 2025-12-05
src/content/guide/wallpaper-repair.mdx:pubDate: 2025-11-18
src/content/guide/winter-tire-timing.mdx:pubDate: 2025-10-15
```

- [x] **Step 3: コミット**

```bash
git add src/content/guide/
git commit -m "content: distribute guide article pubDates over 6 months (2025-10 to 2026-03)"
```

---

## Task 2: M2 — 404ページ

**Files:**
- Create: `src/pages/404.astro`

- [x] **Step 1: 404.astroを作成する**

`src/pages/404.astro` を以下の内容で作成する:

```astro
---
import Base from "../layouts/Base.astro";
---

<Base title="404 — ページが見つかりません | 撮偵">
  <article class="article-page not-found-page">
    <header class="article-header">
      <p class="not-found-code">404</p>
      <h1 class="article-title">ページが見つかりません</h1>
      <p class="not-found-desc">
        URLが変更されたか、削除された可能性があります。
      </p>
    </header>

    <nav class="not-found-nav">
      <a href="/" class="not-found-link">
        <span class="not-found-link-icon">🏠</span>
        トップページへ戻る
      </a>
      <a href="/" class="not-found-link">
        <span class="not-found-link-icon">🤖</span>
        AI診断ツールを使う
      </a>
      <a href="/guide/" class="not-found-link">
        <span class="not-found-link-icon">📖</span>
        ガイド記事一覧
      </a>
    </nav>
  </article>
</Base>

<style>
.not-found-page {
  text-align: center;
  padding: 3rem 1rem;
}

.not-found-code {
  font-size: 5rem;
  font-weight: 900;
  color: var(--primary);
  line-height: 1;
  margin: 0 0 0.5rem;
  font-family: "M PLUS Rounded 1c", sans-serif;
}

.not-found-desc {
  color: var(--text-muted);
  font-size: 0.9375rem;
  margin: 0.5rem 0 2.5rem;
}

.not-found-nav {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 320px;
  margin: 0 auto;
}

.not-found-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  text-decoration: none;
  color: var(--text);
  font-size: 0.9375rem;
  font-weight: 500;
  transition: border-color 0.15s, background 0.15s;
}

.not-found-link:hover {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

.not-found-link-icon {
  font-size: 1.125rem;
}
</style>
```

- [x] **Step 2: ビルドして確認する**

```bash
npm run build 2>&1 | tail -5
```

期待: `✓` または `Build complete` でエラーなし。

- [x] **Step 3: コミット**

```bash
git add src/pages/404.astro
git commit -m "feat: add 404 page with navigation links"
```

---

## Task 3: M1 — SchemaOrg コンポーネント作成

**Files:**
- Create: `src/components/SchemaOrg.astro`

- [x] **Step 1: SchemaOrg.astroを作成する**

`src/components/SchemaOrg.astro` を以下の内容で作成する:

```astro
---
type Props =
  | { type: "website" }
  | {
      type: "article";
      title: string;
      description: string;
      pubDate: Date;
      url: string;
    };

const props = Astro.props;

const siteUrl = "https://satsu-tei.com";
const siteName = "撮偵";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
};

const articleSchema =
  props.type === "article"
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: props.title,
        description: props.description,
        datePublished: props.pubDate.toISOString(),
        url: props.url,
        author: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl,
        },
        publisher: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl,
        },
      }
    : null;

const breadcrumbSchema =
  props.type === "article"
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "トップ", item: siteUrl + "/" },
          { "@type": "ListItem", position: 2, name: "ガイド", item: siteUrl + "/guide/" },
          { "@type": "ListItem", position: 3, name: props.title, item: props.url },
        ],
      }
    : null;
---

<script type="application/ld+json" set:html={JSON.stringify(organizationSchema)} />
{articleSchema && <script type="application/ld+json" set:html={JSON.stringify(articleSchema)} />}
{breadcrumbSchema && <script type="application/ld+json" set:html={JSON.stringify(breadcrumbSchema)} />}
```

- [x] **Step 2: TypeScriptエラーがないか確認する**

```bash
npx tsc --noEmit 2>&1 | head -20
```

期待: エラーなし（出力なし）。

- [x] **Step 3: コミット**

```bash
git add src/components/SchemaOrg.astro
git commit -m "feat: add SchemaOrg component for JSON-LD structured data"
```

---

## Task 4: M1 + M4 — Base.astro・[slug].astro への統合

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/guide/[slug].astro`

- [x] **Step 1: Base.astroにhead slotとauthorメタタグとSchemaOrgを追加する**

`src/layouts/Base.astro` の `<head>` 内を以下のように変更する。

変更前:
```astro
---
interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}
```

変更後:
```astro
---
import SchemaOrg from "../components/SchemaOrg.astro";

interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}
```

変更前（headタグ内の `<meta name="twitter:card" ...>` の直後）:
```astro
    <meta name="twitter:card" content="summary_large_image" />

    <!-- Fonts -->
```

変更後:
```astro
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="author" content="撮偵 — AIホームケア診断" />

    <!-- Structured Data -->
    <SchemaOrg type="website" />
    <slot name="head" />

    <!-- Fonts -->
```

- [x] **Step 2: [slug].astroにSchemaOrgとE-E-A-Tバッジを追加する**

`src/pages/guide/[slug].astro` を以下のように変更する。

変更前:
```astro
---
import Base from "../../layouts/Base.astro";
import AdUnit from "../../components/AdUnit.astro";
import { getCollection, getEntry, render } from "astro:content";
```

変更後:
```astro
---
import Base from "../../layouts/Base.astro";
import AdUnit from "../../components/AdUnit.astro";
import SchemaOrg from "../../components/SchemaOrg.astro";
import { getCollection, getEntry, render } from "astro:content";
```

変更前（`<Base title=...>` の直後）:
```astro
<Base title={entry.data.title} description={entry.data.description}>
  <article class="article-page">

    <header class="article-header">
      <h1 class="article-title">{entry.data.title}</h1>
      <time class="article-date" datetime={entry.data.pubDate.toISOString()}>
        {entry.data.pubDate.toLocaleDateString("ja-JP")}
      </time>
    </header>
```

変更後:
```astro
<Base title={entry.data.title} description={entry.data.description}>
  <SchemaOrg
    slot="head"
    type="article"
    title={entry.data.title}
    description={entry.data.description}
    pubDate={entry.data.pubDate}
    url={new URL(`/guide/${slug}/`, Astro.site).toString()}
  />

  <article class="article-page">

    <header class="article-header">
      <h1 class="article-title">{entry.data.title}</h1>
      <time class="article-date" datetime={entry.data.pubDate.toISOString()}>
        {entry.data.pubDate.toLocaleDateString("ja-JP")}
      </time>
      <p class="article-meta-note">
        🤖 AIと専門データベースの組み合わせで診断精度を追求しています
      </p>
    </header>
```

次に、`[slug].astro` の末尾の `<style>` ブロック（なければ新規追加）に以下を追記する:

```astro
<style>
.article-meta-note {
  font-size: 0.8125rem;
  color: var(--text-muted);
  background: var(--bg-alt);
  border-left: 3px solid var(--primary);
  padding: 0.5rem 0.875rem;
  margin: 0.5rem 0 0;
  border-radius: 0 4px 4px 0;
}
</style>
```

- [x] **Step 3: ビルドしてJSON-LDが出力されているか確認する**

```bash
npm run build 2>&1 | tail -5
```

期待: エラーなし。

```bash
grep -l "application/ld+json" dist/client/guide/*/index.html 2>/dev/null | head -3
```

期待: ガイド記事のhtmlファイルが1件以上ヒット。

```bash
grep "application/ld+json" dist/client/guide/black-mold-removal/index.html
```

期待: `<script type="application/ld+json">` が3行（Organization・Article・BreadcrumbList）ヒット。

- [x] **Step 4: TypeScriptエラーがないか確認する**

```bash
npx tsc --noEmit 2>&1 | head -20
```

期待: エラーなし。

- [x] **Step 5: 既存テストが通ることを確認する**

```bash
npm test
```

期待: `16 passed` (既存テスト全通過)。

- [x] **Step 6: コミット**

```bash
git add src/layouts/Base.astro src/pages/guide/[slug].astro
git commit -m "feat: integrate SchemaOrg structured data and E-E-A-T badge into guide pages"
```

---

## Task 5: 最終確認

- [x] **Step 1: クリーンビルドで全ページ確認**

```bash
npm run build 2>&1 | grep -E "(error|warn|✓|complete)" | head -20
```

期待: `error` の行がないこと。

- [x] **Step 2: 404ページのHTMLを確認**

```bash
ls dist/client/404.html 2>/dev/null && echo "EXISTS" || echo "NOT FOUND"
```

期待: `EXISTS`

- [x] **Step 3: author メタタグの確認**

```bash
grep 'name="author"' dist/client/index.html
```

期待:
```html
<meta name="author" content="撮偵 — AIホームケア診断"/>
```

- [x] **Step 4: ガイド一覧ページで公開日が分散していることを確認**

```bash
grep -r "2025-10\|2025-11\|2025-12\|2026-01\|2026-02\|2026-03" dist/client/guide/ --include="*.html" -l | wc -l
```

期待: `10`（全10記事のhtmlが異なる月の日付を含む）

- [x] **Step 5: progress.md の Medium 課題を完了済みに更新**

`.claude/progress.md` の残課題テーブルを以下のように更新する:

```markdown
| M1 | ~~**構造化マークアップ未実装**~~ | ✅ SchemaOrg.astro作成。Organization/Article/BreadcrumbList対応済み |
| M2 | ~~**404 ページ未実装**~~ | ✅ src/pages/404.astro作成。診断・ガイドへのナビゲーション付き |
| M3 | ~~**ガイド記事公開日の集中**~~ | ✅ 全10記事を2025-10〜2026-03の6ヶ月間に分散済み |
| M4 | ~~**E-E-A-T 欠如**~~ | ✅ authorメタタグ追加・記事ページにAIコンセプトバッジ追加 |
```

- [x] **Step 6: 最終コミット**

```bash
git add .claude/progress.md
git commit -m "chore: mark M1-M4 medium tasks as complete in progress.md"
```
