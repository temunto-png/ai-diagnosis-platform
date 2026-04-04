# マネタイズ強化 Actions 1–5 設計書

**作成日**: 2026-04-04
**対象**: satsu-tei.com (AI診断プラットフォーム)
**目的**: Amazon アソシエイト 3件売上達成・収益チャネル早期有効化

---

## 背景と優先度

現時点で実際に収益を生んでいるチャネルはゼロ。Amazon アソシエイトは登録から180日以内に3件売上が必要で、達成できない場合はアカウント停止リスクがある。本設計はその達成を主目的とした短期施策（1〜2週間以内完了）を対象とする。

| Action | 種別 | 優先度 |
|--------|------|--------|
| 1. 重度判定CPAルーティング | コード変更 | 高（高単価CVR） |
| 2. ガイド一覧ページCTA追加 | コード変更 | 高（既存流入活用） |
| 3. SNS商品紹介投稿 | コード＋コンテンツ | 高（Amazon 3件達成） |
| 4. 楽天・AdSense承認後有効化 | 手動チェックリスト | 中（承認待ち） |
| 5. 結果ページ強化 | コード変更 | 中（離脱防止） |

---

## Action 1: 重度判定CPAルーティング

### 概要

カビ診断・DIY修理診断で「重度」と判定された場合、アフィリエイトリンクに代わり専門業者サービス（CPA）へのリンクを表示する。CPA URLはWorker secretで管理し、未設定時はアフィリエイトにフォールバックする。

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/configs/kabi-diagnosis.json` | monetization条件に重度ルール追加 |
| `src/configs/diy-repair.json` | 同上 |
| `src/lib/monetization.ts` | `applyMonetization` に `cpaUrl?: string` 引数追加、CPA未設定フォールバック実装 |
| `src/pages/api/[appId]/analyze.ts` | env変数を読んで `applyMonetization` に渡す |
| `wrangler.toml` | 新secretのコメント記録 |

### JSON config変更

```jsonc
// src/configs/kabi-diagnosis.json
"monetization": [
  { "condition": "severity = '重度'", "type": "cpa" },
  { "condition": "default", "type": "affiliate", "keyword": "{{products[0].amazon_keyword}}" }
]

// src/configs/diy-repair.json
"monetization": [
  { "condition": "damage_level = '重度'", "type": "cpa" },
  { "condition": "default", "type": "affiliate", "keyword": "{{products[0].amazon_keyword}}" }
]
```

`cpa_url` はconfigに書かない。URLはWorker secretから注入する。

### monetization.ts の変更

**関数シグネチャ変更:**
```typescript
export function applyMonetization(
  result: Record<string, unknown>,
  rules: MonetizationRule[],
  context: Record<string, string>,
  ids: { amazonId: string; rakutenId: string },
  cpaUrl?: string   // 追加
): ...
```

**rules.find() のロジック変更:**

現在の `rules.find()` は最初にマッチしたルールを返す。`type === "cpa"` かつURLが取得できない場合は次のルールに進む（フォールバック）ようにする。

```
条件マッチング:
  candidate.condition === "default" → 常にマッチ
  それ以外 → result[field] === value を評価

type === "cpa" の場合の追加ガード:
  cpaUrl（env） または rule.cpa_url（config） のいずれかが存在する場合のみマッチ
  どちらも未設定 → このルールをスキップ（次のルールへ）
```

**CPA URL解決の優先順位:**
1. `cpaUrl`（env var）
2. `rule.cpa_url`（config直書き、後方互換）

最終的なURLは `sanitizeCpaUrl()` でHTTPS検証済みのものを使用。

### analyze.ts の変更

```typescript
// appIdに対応するCPA URLをenvから取得
const cpaUrl =
  appId === "kabi-diagnosis" ? (env.KABI_CPA_URL ?? undefined)
  : appId === "diy-repair"   ? (env.DIY_CPA_URL ?? undefined)
  : undefined;

// applyMonetizationにcpaUrlを追加で渡す
const monetization = applyMonetization(result, config.monetization, context, ids, cpaUrl);
```

### Worker secret（手動）

```bash
npx wrangler secret put KABI_CPA_URL   # くらしのマーケット等の承認後に設定
npx wrangler secret put DIY_CPA_URL    # DIY修理向けCPAの承認後に設定
```

### A8.net申請タスク（手動、コード変更と並行）

1. A8.netにログイン → プログラム検索 → 「くらしのマーケット」で申請（ハウスクリーニング全般）
2. 「おそうじ本舗」をカビ専門として検索・検討
3. DIY修理向けとして「ホームセンター通販系」も検索
4. 承認後: 上記 `wrangler secret put` でWorkerに設定 → 即時有効化

---

## Action 2: ガイド一覧ページ CTA追加

### 概要

`/guide/` ページには現状、記事カードグリッドのみで診断ツールへの導線がない。SEOから流入したユーザーを診断ツールに誘導するCTAを記事グリッドの上に追加する。

### 変更ファイル

`src/pages/guide/index.astro` のみ。

### 設計

記事グリッドの直前に `DiagnosisCTA` を2つ（カビ診断・DIY修理診断）横並びで挿入する。

**レイアウト:**
```
[ページヘッダー: 使い方ガイド]

[CTAセクション] ← 追加
  ┌──────────────────┐ ┌──────────────────┐
  │ 🔬 AIカビ診断    │ │ 🔧 AI修理診断    │
  │ [無料で診断する] │ │ [無料で診断する] │
  └──────────────────┘ └──────────────────┘

[記事カードグリッド（既存）]
```

- `DiagnosisCTA` を `variant="top"` で使用（コンパクトなオレンジ枠デザイン）
- CTAセクションは2カラムグリッド。モバイル（540px以下）は縦積み
- GAイベントは既存 `DiagnosisCTA` コンポーネントが自動で送信

### 追加するコード概要

```astro
import DiagnosisCTA from "../../components/DiagnosisCTA.astro";

<!-- 記事グリッドの直前に挿入 -->
<div class="cta-grid">
  <DiagnosisCTA diagnosisType="kabi-diagnosis" variant="top" />
  <DiagnosisCTA diagnosisType="diy-repair" variant="top" />
</div>
```

---

## Action 3: SNS商品紹介投稿（product-promo型）

### 概要

Amazon アソシエイトの3件売上達成を主目的に、商品リンク付きのSNS投稿を定期配信する。既存の投稿生成システムに `product-promo` タイプを追加し、Claude API呼び出しなしで固定テンプレートから生成する。

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `social/scripts/types.ts` | `PostType` に `"product-promo"` 追加、`CalendarEntry` に `amazon_keyword?: string` 追加 |
| `social/scripts/generate-post.ts` | `product-promo` タイプの固定テンプレート生成ロジック追加 |
| `social/content-calendar.yml` | `product-promo` 投稿を4件追加 |

### types.ts の変更

```typescript
export type PostType =
  | "article-promo"
  | "tips"
  | "rental-aru-aru"
  | "seasonal"
  | "product-promo";   // 追加

export interface CalendarEntry {
  date: string;
  platforms: Platform[];
  type: PostType;
  slug: string | null;
  amazon_keyword?: string;   // 追加（product-promo時に使用）
}
```

### generate-post.ts の変更

`product-promo` タイプを検知した場合、Claude APIを呼ばず固定テンプレートで生成する。

**テンプレートマップ（generate-post.ts内に定義）:**

```typescript
const PRODUCT_DESCRIPTIONS: Record<string, { description: string; hashtags: string }> = {
  "カビキラー カビ取り 塩素系":    { description: "浴室の黒カビにはコレ一択🧴\n塩素系カビキラーで根こそぎ除去。", hashtags: "#カビ対策 #撮偵 #浴室掃除" },
  "防カビスプレー 浴室 予防":      { description: "カビ取りより予防が大事💡\n防カビスプレーで発生前にブロック。",   hashtags: "#カビ予防 #撮偵 #ハウスケア" },
  "壁 補修 パテ DIY":              { description: "壁のへこみ・穴はパテで補修🔧\n道具なしで10分で直せる。",         hashtags: "#DIY修理 #撮偵 #壁補修" },
  "フローリング 傷 補修 マーカー": { description: "フローリングの細かいキズ✏️\n補修マーカーで目立たなく。",         hashtags: "#DIY修理 #撮偵 #床補修" },
};
```

**生成ロジック:**
```
product-promo タイプの場合:
  1. entry.amazon_keyword でマップ検索
  2. テンプレートに埋め込み
  3. Amazon URL: https://www.amazon.co.jp/s?k={encodeURIComponent(keyword)}&tag=satsutei-22
  4. 文字数: URL含めて280字以内に収める（Xの制限）
  5. Claude API呼び出しなし
```

**X投稿フォーマット:**
```
{description}
↓ Amazonで確認
https://www.amazon.co.jp/s?k={keyword}&tag=satsutei-22
{hashtags}
```

### content-calendar.yml に追加する投稿

```yaml
- date: "2026-04-10"
  platforms: [x]
  type: product-promo
  slug: null
  amazon_keyword: "カビキラー カビ取り 塩素系"

- date: "2026-04-17"
  platforms: [x]
  type: product-promo
  slug: null
  amazon_keyword: "防カビスプレー 浴室 予防"

- date: "2026-04-24"
  platforms: [x]
  type: product-promo
  slug: null
  amazon_keyword: "壁 補修 パテ DIY"

- date: "2026-05-01"
  platforms: [x]
  type: product-promo
  slug: null
  amazon_keyword: "フローリング 傷 補修 マーカー"
```

---

## Action 4: 楽天・AdSense承認後の有効化チェックリスト

コード変更なし。各サービスの承認後に実施する手順。

### 楽天アフィリエイト

1. `https://satsu-tei.com/guide/` にアクセスし、ページ表示を確認
2. 楽天アフィリエイト管理画面でサイト登録を完了
3. `src/configs/affiliate-programs.json` の `rakuten-affiliate.status` を `"active"` に更新してコミット
4. `RAKUTEN_AFFILIATE_ID` はWorker secretに設定済み ✅ → 追加対応不要

### もしもアフィリエイト

楽天と同手順。`moshimo-base.status` を `"active"` に更新。

### Google AdSense

- 承認メール受信を確認
- 追加のコード・環境変数変更は不要（ビルド済みHTMLに広告コードは埋め込み済み）

### A8.net 個別プログラム（Action 1と連動）

- くらしのマーケット等が承認されたら `wrangler secret put KABI_CPA_URL` / `DIY_CPA_URL`
- 承認情報を `src/configs/affiliate-programs.json` に追記

---

## Action 5: 結果ページ強化

### 概要

`/[appId]/result/[uuid].astro` は現在ほぼ空ページ（「診断ツールに戻る」のみ）で、ユーザーが即離脱する。AdUnit・関連記事・再診断CTAを追加して収益化と回遊を促進する。

### 変更ファイル

`src/pages/[appId]/result/[uuid].astro` のみ。

### 設計（ページ構成、上から順）

```
[h1: 診断結果]
[既存の説明テキスト]

[AdUnit]  ← PUBLIC_ADSENSE_SLOT_TOP を流用（AdSense承認後に専用スロットを作成してもよい）

[関連ガイド記事セクション: 「こちらの記事もどうぞ」]
  ├─ 記事カード × 3本（appIdに対応した固定リスト）
  │     kabi-diagnosis → black-mold-removal / mold-prevention-spray / wallpaper-repair-seal
  │     diy-repair     → floor-repair-paste / wallpaper-repair / flooring-scratch
  └─ getEntry() でtitle・descriptionを取得して表示

[DiagnosisCTA variant="bottom"]  ← 「もう一度診断する」

[診断ツールに戻る（既存リンク）]
```

### 関連記事の取得方法

静的レンダリング（`prerender = true`）のため、ビルド時に `getEntry()` で記事データを取得する。appIdをキーとしたハードコードのスラッグリストを使用し、動的ルックアップは行わない。

```typescript
const RELATED_ARTICLES: Record<string, string[]> = {
  "kabi-diagnosis": ["black-mold-removal", "mold-prevention-spray", "wallpaper-repair-seal"],
  "diy-repair":     ["floor-repair-paste", "wallpaper-repair", "flooring-scratch"],
};
```

### AdUnitの挙動

AdSense未承認中はAdUnitコンポーネントがsilent failする（既存の挙動通り）。AdSense承認後、必要であれば専用スロット `PUBLIC_ADSENSE_SLOT_RESULT` を作成してGitHub Secretsに追加し、切り替える。現時点では `PUBLIC_ADSENSE_SLOT_TOP` を流用。

---

## テスト方針

| 対象 | テスト内容 |
|------|-----------|
| `monetization.ts` | CPA URL有設定・無設定・フォールバック動作の単体テスト追加 |
| `generate-post.ts` | `product-promo` タイプの生成テスト追加 |
| 型チェック | `npx tsc --noEmit` で全変更ファイルを検証 |
| ビルド | `npm run build` で静的生成エラーがないことを確認 |

---

## デプロイ手順

```bash
# コード変更後
npx tsc --noEmit && npm test
npm run build
npx wrangler deploy --config dist/server/wrangler.json

# CPA承認後（別タイミング）
npx wrangler secret put KABI_CPA_URL
npx wrangler secret put DIY_CPA_URL
```

---

## 影響範囲まとめ

| ファイル | Action |
|---------|--------|
| `src/lib/monetization.ts` | 1 |
| `src/pages/api/[appId]/analyze.ts` | 1 |
| `src/configs/kabi-diagnosis.json` | 1 |
| `src/configs/diy-repair.json` | 1 |
| `src/pages/guide/index.astro` | 2 |
| `social/scripts/types.ts` | 3 |
| `social/scripts/generate-post.ts` | 3 |
| `social/content-calendar.yml` | 3 |
| `src/pages/[appId]/result/[uuid].astro` | 5 |
| `src/configs/affiliate-programs.json` | 4（手動・承認後） |
