# AdSense マネタイズ最大化設計

**日付:** 2026-04-04
**対象:** satsu-tei.com
**ステータス:** 承認済み

---

## 概要

Google AdSense をガイド記事ページ中心に配置し、アフィリエイト収益（Amazon/楽天）と干渉させずにマネタイズを最大化する。診断ツールページは高収益アフィリエイト専用とし、AdSense との競合を避ける。

---

## 方針

### 収益優先順位

```
診断結果画面: アフィリエイト（Amazon/楽天）≫ AdSense
ガイド記事:   AdSense + DiagnosisCTA（アフィリエイト誘導）
トップページ: AdSense（補助）
```

アフィリエイトは1件成立で数百〜数千円の期待値があるのに対し、AdSense のクリック単価は住宅/DIY系で10〜80円程度。高インテントの診断結果画面にはアフィリエイトを集中させ、AdSense には「コンテンツ消費中のユーザー」向けページを割り当てる。

---

## 広告配置設計

### ガイド記事ページ（`/guide/[slug]/`）

**2箇所配置:**

```
[記事ヘッダー]
[DiagnosisCTA variant="top"]
[記事本文（<Content />）]
── AdUnit ①「本文直後」   ← 新規追加（記事本文と DiagnosisCTA の間）
[DiagnosisCTA variant="bottom"]
── AdUnit ②「記事末尾」   ← 既存（有効化）
[ガイド一覧に戻る]
```

- MDX の `<Content />` は単一ブロックのため記事本文内への挿入は行わない（Astro の仕様上、途中への割り込みには MDX 側の改修が必要で複雑度が上がる）
- 冒頭への広告配置は「コンテンツより広告が目立つ」と AdSense 審査で不利になるため除外
- DiagnosisCTA（診断ツールへの誘導）はアフィリエイト収益につながるため広告より優先

### トップページ（`/`）

**1箇所配置:**

```
[ガイドテザーセクション]
── AdUnit ③「フッター前」  ← 新規追加
[フッター]
```

スクロール末端のユーザーに広告を表示。コンバージョン後のユーザーにも自然に接触できる。

### 対象外ページ

| ページ | 理由 |
|---|---|
| `/[appId]/`（診断ツール） | アフィリエイト集中。AdSense との競合で機会損失 |
| `/[appId]/result/[uuid]`（診断結果） | 同上（高インテント画面） |
| `/guide/`（ガイド一覧） | 広告よりコンテンツへの誘導を優先 |
| `/about/`, `/contact/`, `/privacy/`, `/terms/` | トラフィックが少なく効果薄 |

---

## コンポーネント設計

### `AdUnit.astro`（変更）

**現状:** `data-ad-slot` がハードコードのプレースホルダー（コメントアウト中）
**変更後:** `PUBLIC_ADSENSE_SLOT_DEFAULT` 環境変数から取得し、コメントアウトを解除

```astro
---
const adsenseId = import.meta.env.PUBLIC_ADSENSE_CLIENT_ID;
const adSlot = import.meta.env.PUBLIC_ADSENSE_SLOT_DEFAULT;
---

{adsenseId && adSlot && (
  <div class="ad-unit">
    <ins
      class="adsbygoogle"
      style="display:block"
      data-ad-client={adsenseId}
      data-ad-slot={adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>
)}
```

**フォーマット:** `auto` + `full-width-responsive` 固定。Google が文脈に最適なサイズを自動選択するため RPM が手動指定より高い傾向にある。

**スクリプト読み込みの責務分離:** AdSense の `<script async src="...adsbygoogle.js">` は `Base.astro` の `<head>` で一度だけ読み込む。`AdUnit.astro` は `<ins>` タグと `.push({})` の呼び出しのみを担当し、スクリプト読み込みは行わない。これにより複数 `<AdUnit />` を配置しても二重読み込みが発生しない。

**スロット分離:** 配置ごとに別スロット ID を使用し、AdSense レポートで配置別の RPM・CTR・収益を計測可能にする。同一スロット ID を複数箇所で使うとレポートが合算されて効果測定ができないため。

### `guide/[slug].astro`（変更）

DiagnosisCTA(bottom) と article-back の間にある既存の `<AdUnit />` はそのまま（末尾②）。
新たに本文直後①として `<AdUnit />` を `<div class="article-body">` の終了直後に追加。

```astro
    <div class="article-body">
      <Content />
    </div>

    <AdUnit />                          {/* ① 本文直後（新規） */}

    <DiagnosisCTA diagnosisType={diagnosisType} variant="bottom" />

    <AdUnit />                          {/* ② 記事末尾（既存・有効化） */}

    <nav class="article-back">
```

### `pages/index.astro`（変更）

guide-teaser セクションの直後にフッター前③を追加。

```astro
  <section class="guide-teaser">
    ...
  </section>

  <AdUnit />                            {/* ③ フッター前（新規） */}
```

---

## 環境変数

| 変数名 | 説明 | 設定タイミング |
|---|---|---|
| `PUBLIC_ADSENSE_CLIENT_ID` | `ca-pub-XXXXXXXXXXXXXXXX` | AdSense アカウント作成後（審査前でも設定可） |
| `PUBLIC_ADSENSE_SLOT_ARTICLE_MID` | ガイド記事・本文直後スロット ID | **AdSense 承認後**に設定 |
| `PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM` | ガイド記事・末尾スロット ID | 同上 |
| `PUBLIC_ADSENSE_SLOT_TOP` | トップページ・フッター前スロット ID | 同上 |

`PUBLIC_*` 変数は Vite/Astro のビルド時に埋め込まれる。`PUBLIC_ADSENSE_CLIENT_ID` のみ設定された状態では Base.astro のスクリプト読み込みだけが行われ広告は非表示のまま（AdSense 審査中の自然な状態を維持できる）。

**⚠️ 注意:** スロット変数はビルド時変数のため、Cloudflare Pages で変数を追加しても**再ビルド + 再デプロイが必要**。変数設定後に `npm run build && npx wrangler deploy` を実行すること。

**staging/preview 環境について:** Cloudflare Pages の preview branch にも同じビルド変数が流れる場合、preview 環境で広告枠が有効になる。AdSense は承認ドメイン外では収益化しないため収益影響はないが、意図しない表示を避けたい場合は preview 用のビルド変数に `PUBLIC_ADSENSE_SLOT_*` を設定しないこと。

---

## 申請〜有効化フロー

```
1. [コード実装] AdUnit.astro・各ページを変更してデプロイ
      ↓ PUBLIC_ADSENSE_SLOT_* 未設定のため広告非表示
2. [AdSense申請] Google AdSense 管理画面でサイト（satsu-tei.com）を申請
      ↓ 審査期間：通常数日〜2週間
3. [承認後] AdSense 管理画面で広告ユニットを3つ作成 → 各スロット ID を取得
      └ satsu-tei-article-mid / satsu-tei-article-bottom / satsu-tei-top
4. [環境変数設定] Cloudflare Pages のビルド環境変数に3変数を追加
      PUBLIC_ADSENSE_SLOT_ARTICLE_MID / ARTICLE_BOTTOM / TOP
5. [再ビルド + 再デプロイ] PUBLIC_* はビルド時変数のため環境変数設定後に必ず実行
      npm run build && npx wrangler deploy --config dist/server/wrangler.json
```

---

## スタイリング

`AdUnit.astro` の外側 `.ad-unit` に最小限のスタイルを追加して視認性と UX を担保する。

```css
.ad-unit {
  margin: 1.5rem 0;
  min-height: 90px;          /* レイアウトシフト防止 */
  text-align: center;
}
```

---

## 非対象（スコープ外）

- Auto Ads（全ページ自動配置）: 診断ページへの意図しない広告挿入リスクがあるため使用しない
- A/B テスト（広告位置の最適化）: 初期実装のスコープ外。データ蓄積後に検討
- 動的 CTA（P2 施策）: 別設計書で対応
