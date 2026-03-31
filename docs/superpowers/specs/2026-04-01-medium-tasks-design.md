# Medium課題 実装設計書

作成日: 2026-04-01
対象: 撮偵（satsu-tei.com）

---

## 概要

progress.md に記録されたMedium課題（M1〜M4）を一括実装する。
いずれもSEO・ユーザー体験・コンテンツ品質に関わる改善で、機能追加ではなく品質向上が目的。

---

## M1: Schema.org 構造化マークアップ

### 目的
Google リッチリザルト対応。`Article` タイプで検索結果に公開日・サイト名が表示されるようにする。

### 実装方針
- **新規ファイル:** `src/components/SchemaOrg.astro`
- **Props インターフェース:**
  ```ts
  type Props =
    | { type: "website" }
    | { type: "article"; title: string; description: string; pubDate: Date; url: string }
  ```
- **出力するJSON-LD:**
  - 全ページ共通: `Organization`（name: "撮偵", url: Astro.site）
  - `type="article"` の場合: `Article` + `BreadcrumbList`（トップ > ガイド > 記事名）
- **組み込み先:**
  - `Base.astro`: `<head>` 内に `<slot name="head" />` を追加し、`<SchemaOrg type="website" />` をデフォルトで出力
  - `guide/[slug].astro`: `<SchemaOrg slot="head" type="article" ... />` を `<Base>` 内で使用して head スロットに注入

### BreadcrumbList 構造（ガイド記事）
```
トップ (https://satsu-tei.com/)
  └ ガイド (https://satsu-tei.com/guide/)
       └ {記事タイトル} (https://satsu-tei.com/guide/{slug}/)
```

---

## M2: 404ページ

### 目的
存在しないURLへのアクセス時にCloudflareデフォルト画面ではなく、ブランド統一されたページを表示する。

### 実装方針
- **新規ファイル:** `src/pages/404.astro`
- Cloudflare Workers + Astro static build では `404.astro` が自動的に404レスポンスとして機能する
- `Base.astro` レイアウトを使用してデザイン統一

### ページ構成
- タイトル: `404 — ページが見つかりません | 撮偵`
- メインメッセージ: 「ページが見つかりません」
- サブテキスト: 「URLが変更されたか、削除された可能性があります。」
- ナビゲーションリンク（3つ）:
  1. トップページへ戻る（`/`）
  2. AI診断ツールを使う（`/#apps` またはトップ）
  3. ガイド記事一覧（`/guide/`）
- スタイル: 既存の `article-page` クラスを流用し、新規CSSは最小限に

---

## M3: ガイド記事公開日の分散

### 目的
全10記事が `2026-03-30` に集中しているため、Googleのスパム判定を避けるため6ヶ月間に分散する。

### 変更方針
- 各MDXファイルの frontmatter `pubDate` を直接編集
- 季節性のある記事（タイヤ・カビ）は関連する季節に合わせる

### 公開日割り当て

| ファイル | 変更後 pubDate | 備考 |
|---------|--------------|------|
| `black-mold-removal.mdx` | 2026-03-22 | 最新（春のカビ対策） |
| `car-scratch-repair.mdx` | 2026-02-28 | |
| `floor-repair-paste.mdx` | 2026-02-15 | |
| `flooring-scratch.mdx` | 2026-01-25 | |
| `mold-prevention-spray.mdx` | 2026-01-10 | |
| `rental-wall-repair.mdx` | 2025-12-20 | |
| `wallpaper-repair-seal.mdx` | 2025-12-05 | |
| `wallpaper-repair.mdx` | 2025-11-18 | |
| `tire-check-timing.mdx` | 2025-11-03 | 冬タイヤシーズン前 |
| `winter-tire-timing.mdx` | 2025-10-15 | 冬タイヤシーズン前（最古） |

---

## M4: E-E-A-T強化

### 目的
著者情報・専門性の訴求を追加し、Googleの品質評価（E-E-A-T）を改善する。
実名著者は使用せず、サイトコンセプト訴求で対応（ユーザー確認済み）。

### 実装方針

**1. `Base.astro` に `author` メタタグを追加**
```html
<meta name="author" content="撮偵 — AIホームケア診断" />
```

**2. `guide/[slug].astro` に E-E-A-T バッジを追加**

記事ヘッダー（タイトル・日付）の直下に小さなバナーを挿入:
```
🤖 AIと専門データベースの組み合わせで診断精度を追求しています
```

スタイル: `article-meta-note` クラスで薄い背景色・小文字・左ボーダーのシンプルなデザイン。

**3. Schema.org との連動**

M1の `Article` JSON-LDの `author` フィールドに組織情報を設定:
```json
"author": {
  "@type": "Organization",
  "name": "撮偵",
  "url": "https://satsu-tei.com/"
}
```

---

## 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `src/components/SchemaOrg.astro` | 新規作成 |
| `src/pages/404.astro` | 新規作成 |
| `src/layouts/Base.astro` | 修正（SchemaOrg追加・authorメタ追加） |
| `src/pages/guide/[slug].astro` | 修正（SchemaOrg・E-E-A-Tバッジ追加） |
| `src/content/guide/*.mdx` (全10件) | 修正（pubDate変更） |

---

## 非対応事項

- 実名著者・個人プロフィールページ: 不要（ユーザー確認済み）
- microdata形式: JSON-LDを採用（Googleが推奨）
- 診断ツールページへのSchema.org追加: 今回スコープ外
