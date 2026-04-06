# P5 ピラーページ設計書

## 概要

SEO強化のため、既存クラスター記事を束ねるピラーページを2本作成する。

| ページ | URL | 対応診断アプリ |
|--------|-----|--------------|
| カビ完全ガイド | `/guide/kabi-complete-guide/` | `kabi-diagnosis` |
| DIY修理完全ガイド | `/guide/diy-repair-complete-guide/` | `diy-repair` |

---

## アーキテクチャ

### 実装方針

- **専用Astroページ×2**（独立ファイル、共通コンポーネントなし）
- `src/pages/guide/kabi-complete-guide.astro`
- `src/pages/guide/diy-repair-complete-guide.astro`
- 既存 `[slug].astro` は変更しない
- `export const prerender = true`（静的ページ）

### ページ構造（両ページ共通）

```
<Base title description>
  <SchemaOrg type="article" + faq />
  <article class="article-page">
    1. ヘッダー（h1 + description + summaryボックス）
    2. DiagnosisCTA variant="top"
    3. 本文セクション × 3〜5本
       └ h2見出し + 200〜300字解説 + 記事カードグリッド（2列）
    4. AdUnit (PUBLIC_ADSENSE_SLOT_ARTICLE_MID)
    5. DiagnosisCTA variant="bottom"
    6. AdUnit (PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM)
    7. ガイド一覧へ戻るリンク
  </article>
</Base>
```

記事カードは既存 `.related-articles` のスタイルを流用。
ピラーページ内カードグリッドは `grid-template-columns: repeat(2, 1fr)`（モバイルは1列）。

---

## ページ詳細

### カビ完全ガイド

**ファイル:** `src/pages/guide/kabi-complete-guide.astro`
**URL:** `/guide/kabi-complete-guide/`

**frontmatter相当の設定値:**

```
title:       カビ完全ガイド｜種類・原因・除去・予防を徹底解説
description: 浴室・押入れ・壁に発生するカビの原因と健康リスク、自分でできる除去方法から再発防止策まで完全解説。黒カビ・白カビの違い、塩素系・アルコール系洗剤の使い分け、専門業者に依頼すべき状態の見極め方も。
pubDate:     2026-04-06
```

**本文セクション:**

| # | h2見出し | 内容 | リンク先記事 |
|---|---------|------|------------|
| 1 | カビが発生する原因と健康リスク | 湿度・温度・栄養源の三条件、胞子吸入によるアレルギー・気管支炎リスク、建材劣化への影響。200字程度。 | なし（概論） |
| 2 | 黒カビの除去方法 | 塩素系・アルコール系・重曹の使い分け概説。詳細記事へ誘導。250字程度。 | `black-mold-removal` |
| 3 | カビの予防・防止策 | 防カビスプレーの効果・選び方・使用タイミング概説。250字程度。 | `mold-prevention-spray` |
| 4 | 専門業者に依頼すべきケース | 重度・広範囲・天井・健康被害が出ている場合の判断基準。CTA（`kabi-diagnosis`）へ誘導。200字程度。 | なし |

**FAQ（4件）:**

1. Q: カビは自分で除去できますか？ → 軽度〜中度は市販洗剤で対応可。広範囲・重度・天井は業者推奨。
2. Q: カビが健康に与える影響は？ → 胞子吸入でアレルギー・喘息・皮膚炎。免疫低下者・子ども・高齢者は特に注意。
3. Q: カビの再発を防ぐには？ → 防カビスプレー塗布＋湿度60%以下維持＋換気ルーティン。
4. Q: 業者に依頼した場合の費用目安は？ → 浴室1箇所1〜3万円、広範囲の場合5〜15万円以上。見積もりで確認。

**summary（箇条書き4項目）:**
- カビが繁殖する温湿度条件と健康リスクの全体像
- 場所別・カビの種類別に選ぶ洗剤の使い分け方法
- 自分でできる除去と業者依頼が必要なケースの見極め方
- 再発を防ぐ防カビスプレーと換気ルーティン

---

### DIY修理完全ガイド

**ファイル:** `src/pages/guide/diy-repair-complete-guide.astro`
**URL:** `/guide/diy-repair-complete-guide/`

**frontmatter相当の設定値:**

```
title:       DIY修理完全ガイド｜床・壁・排水口の補修方法を徹底解説
description: フローリングの傷・壁紙の剥がれ・排水口のつまりなど住まいのトラブルをDIYで解決する方法を網羅。必要な道具の選び方、賃貸での注意点、業者に依頼すべき状態の判断基準まで完全解説。
pubDate:     2026-04-06
```

**本文セクション:**

| # | h2見出し | 内容 | リンク先記事 |
|---|---------|------|------------|
| 1 | DIY修理の基本と失敗しないコツ | 修理前の状態確認・材料選び・賃貸での原状回復義務の概説。200字程度。 | なし（概論） |
| 2 | 床・フローリングの補修 | 傷の深さによる補修材選び・補修ペーストとタッチペンの使い分け概説。250字程度。 | `floor-repair-paste`, `flooring-scratch` |
| 3 | 壁・壁紙の修理 | 賃貸壁穴の補修・壁紙の浮き・端めくれの直し方概説。250字程度。 | `rental-wall-repair`, `wallpaper-repair`, `wallpaper-repair-seal` |
| 4 | 排水口・水回りのトラブル | 排水口つまりの原因と重曹・ワイヤーブラシによる解消法概説。200字程度。 | `drain-clog-removal` |
| 5 | プロへの依頼が必要なケース | 構造上の問題・水漏れ・電気系統・広範囲損傷の判断基準。CTA（`diy-repair`）へ誘導。200字程度。 | なし |

**FAQ（4件）:**

1. Q: DIY修理で失敗しないコツは？ → 事前に補修材のテストを目立たない場所で行い、説明書の乾燥時間を守ること。
2. Q: 賃貸の壁や床を自分で修理してもよいですか？ → 軽微な補修は可。ただし退去時の原状回復義務があるため、大きな加工は管理会社へ確認が必要。
3. Q: DIY修理に最低限必要な工具は？ → カッター・ヘラ・マスキングテープ・補修材の4点が基本。場所により追加工具が必要。
4. Q: 業者に頼む目安は？ → 同じ箇所を2回以上試みて改善しない場合、または損傷が10cm以上の広範囲に及ぶ場合は業者相談を推奨。

**summary（箇条書き4項目）:**
- DIY修理を始める前に確認すべき状態チェックと材料選びの基準
- 床・フローリングの傷を深さ別に直す補修材の選び方
- 壁・壁紙の浮き・剥がれ・穴を賃貸でも安全に補修する方法
- 自分でできる修理とプロへ依頼すべき損傷の見極め方

---

## 内部リンク変更

### `src/pages/guide/index.astro`

`getCollection("guide")` は `.astro` ファイルを対象としないため、ピラーページ2本を手動でカードとして追加する。

既存の `guide-grid` の**先頭**に2枚のカードを追加：

```astro
<a href="/guide/kabi-complete-guide/" class="guide-card guide-card-pillar">
  <div class="guide-card-title">カビ完全ガイド</div>
  <div class="guide-card-desc">カビの原因・除去・予防を完全網羅</div>
</a>
<a href="/guide/diy-repair-complete-guide/" class="guide-card guide-card-pillar">
  <div class="guide-card-title">DIY修理完全ガイド</div>
  <div class="guide-card-desc">床・壁・排水口の補修方法を完全網羅</div>
</a>
```

`.guide-card-pillar` にボーダー色（`var(--primary)`）を加えて視覚的に区別。

---

## OGP画像

`/public/og/default.png` を流用（専用OGP画像は作成しない）。

---

## スタイル

新規CSSクラスは以下のみ追加（各ページ内 `<style>` タグ）：

```css
.pillar-section { margin: 2.5rem 0; }
.pillar-section-intro { font-size: 0.9375rem; line-height: 1.75; color: var(--text); margin-bottom: 1.25rem; }
.pillar-card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
@media (max-width: 540px) {
  .pillar-card-grid { grid-template-columns: 1fr; }
}
```

記事カード（`.related-articles li a` 相当）は既存スタイルと同じ構造でインライン定義。

---

## 検証

実装後の確認手順：
1. `npx tsc --noEmit` — 型エラーなし
2. `npm test` — テスト全件パス
3. `npm run build` — ビルド成功
4. `/guide/kabi-complete-guide/` と `/guide/diy-repair-complete-guide/` が表示される
5. 各ページの記事カードリンクが正しいURLを指している
6. `/guide/` のピラーカードが先頭に表示される
