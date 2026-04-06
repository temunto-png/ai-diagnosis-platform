# P3: 既存12記事 SEO最適化設計書

**作成日**: 2026-04-05
**最終更新**: 2026-04-05（世界最高視点レビュー反映）
**対象**: `src/content/guide/*.mdx` 全12記事
**アプローチ**: テンプレート駆動（Approach A）

---

## 目的

1. **title/description最適化** — Googleの表示枠（description: 120〜160文字）に合わせ、検索意図キーワード・具体的数値・ユーザー便益を含む文章に更新
2. **article-summary追加** — 記事冒頭に「この記事でわかること」ボックスを配置し、直帰率改善と滞在時間向上を図る（ユーザーの読後状態変化を示すベネフィット表現）
3. **内部リンク強化** — 同グループ記事への「関連記事」セクションを自動生成し、回遊率とクロールカバレッジを向上させる
4. **updatedDate更新** — 全12記事に `updatedDate: 2026-04-05` を追加し、フレッシュネスシグナルを最大化する

---

## キーワードカニバリゼーション対策

同カテゴリ内で類似キーワードを持つ記事ペアについて、差別化を明確化する。

| ペア | 差別化方針 |
|-----|-----------|
| `flooring-scratch`（すり傷・浅い傷） vs `floor-repair-paste`（深い傷・欠け・へこみ） | titleに損傷深度を明記。互いに相互リンクして「より深い傷の場合」「より浅い傷の場合」と文脈誘導 |
| `wallpaper-repair`（のり・パテ・シール全般） vs `wallpaper-repair-seal`（補修シール深掘り） | titleの差異を維持。wallpaper-repairは「どの補修材を使うか判断する入口」、wallpaper-repair-sealは「シールを使うと決めた後の詳細ガイド」と役割分担を明確化 |

---

## スキーマ変更 (`src/content.config.ts`)

```ts
const guide = defineCollection({
  schema: z.object({
    // ... 既存フィールド ...
    summary: z.array(z.string()).optional(),   // この記事でわかること（3〜5件・ベネフィット表現）
    relatedGroup: z.string().optional(),        // 内部リンクグループ名
  }),
});
```

### relatedGroup 値一覧

| グループ名 | 対象記事 | 備考 |
|-----------|---------|------|
| `kabi` | black-mold-removal, mold-prevention-spray | カビ除去・予防の直接関連 |
| `diy-repair` | floor-repair-paste, flooring-scratch, rental-wall-repair, wallpaper-repair, wallpaper-repair-seal, drain-clog-removal | DIY自力補修・修繕全般 |
| `car-care` | car-scratch-repair, headlight-polish, tire-check-timing, winter-tire-timing | 車のセルフメンテナンス全般 |

> **変更点**: `drain-clog-removal` を `kabi` から `diy-repair` へ移動。排水口つまりはカビより「水回りDIY自力対処」との関連度が高く、diy-repairグループ（5→6記事）での回遊率が期待できる。

---

## テンプレート変更 (`src/pages/guide/[slug].astro`)

### 1. summaryボックス（article-header 直後）

```astro
{entry.data.summary && (
  <div class="article-summary">
    <p class="article-summary-title">この記事でわかること</p>
    <ul>
      {entry.data.summary.map(item => <li>{item}</li>)}
    </ul>
  </div>
)}
```

> 絵文字（📋 等）は使用しない。テキストのみ。

**スタイル**: `--bg-alt` 背景、`--primary` 左ボーダー（3px）、`li::before` にチェックマーク（`content: "✓ "`）、`font-size: 0.9rem`

### 2. 関連記事セクション（`<nav class="article-back">` 直前）

`getStaticPaths` の外で全記事を取得し、同グループを pubDate 降順でフィルタ（自記事除外・最大3件）。

```astro
// ページコンポーネントのスクリプト部分
const allArticles = await getCollection("guide");
const related = entry.data.relatedGroup
  ? allArticles
      .filter(a => a.data.relatedGroup === entry.data.relatedGroup && a.id !== entry.id)
      .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
      .slice(0, 3)
  : [];
```

```astro
{related.length > 0 && (
  <section class="related-articles">
    <h3>関連記事</h3>
    <ul>
      {related.map(a => (
        <li>
          <a href={`/guide/${a.id}/`}>
            <span class="related-category">{a.data.category}</span>
            <span class="related-title">{a.data.title}</span>
            <span class="related-desc">{a.data.description.slice(0, 55)}…</span>
          </a>
        </li>
      ))}
    </ul>
  </section>
)}
```

> **変更点**:
> - `<h2>` → `<h3>`（文書アウトライン保護、Googleへの誤認防止）
> - `pubDate` 降順ソートを明示
> - `description` の先頭55文字をカード内に表示（回遊率向上）

**スタイル**: カード風リスト（`border`+`border-radius`）、カテゴリバッジ（`--primary` 背景・白文字）、タイトルは `font-weight: 600`、descは `font-size: 0.8rem; color: var(--text-muted)`

---

## Frontmatter更新仕様（全12記事）

### 共通方針

| 項目 | 方針 |
|-----|------|
| title | 現行を尊重しつつ深度・具体語を追加。カニバリゼーションペアは損傷度・役割を明示 |
| description | **120〜160文字**（実装時に必ず文字数確認）。①具体的数値・基準値 ②対象ユーザー ③得られる結果 を含める |
| summary | 3〜5件。「何が書いてあるか」ではなく「読むと何ができるようになるか」のベネフィット表現 |
| updatedDate | 全12記事に `updatedDate: 2026-04-05` を追加 |
| relatedGroup | 上記グループ表に従って設定 |

---

### 記事別 Frontmatter 更新内容

#### black-mold-removal
```yaml
title: "黒カビの落とし方と最強洗剤の選び方【浴室・押入れ・壁】"
description: "黒カビ（クロカビ）の効果的な除去方法を、浴室・押入れ・壁クロス別に詳しく解説。塩素系・アルコール系・重曹の使い分け基準から、作業時の安全注意事項、再発を防ぐ防カビスプレーの使い方まで完全網羅します。"
updatedDate: 2026-04-05
relatedGroup: "kabi"
summary:
  - "素材を傷めずカビを根こそぎ除去できる洗剤3種の選び方"
  - "浴室・押入れ・壁クロス別、15分でできる除去手順"
  - "混ぜると危険な組み合わせと、保護具・換気の安全対策"
  - "再発を防ぐ防カビスプレーと換気ルーティン"
```

#### mold-prevention-spray
```yaml
title: "カビ防止スプレーの選び方と効果的な使い方【場所別・2026年版】"
description: "浴室・押入れ・エアコン・靴箱など場所別にカビ防止スプレーのおすすめ商品と選び方を比較。防カビ効果が持続する最適な塗布タイミング、下地処理の手順、塩素系・アルコール系・天然由来タイプの違い、防カビシートとの使い分けポイントをまとめています。"
updatedDate: 2026-04-05
relatedGroup: "kabi"
summary:
  - "場所別（浴室・押入れ・靴箱）に正しいスプレーを選んでカビを長期予防できる"
  - "防カビ効果が最大化する塗布タイミングと下地処理の手順"
  - "塩素系・アルコール系・天然由来タイプの使い分けと安全注意"
```

#### drain-clog-removal
```yaml
title: "排水口のつまりを自分で解消する方法【浴室・キッチン・洗面台】"
description: "排水口のつまりを自分で解消する方法を、浴室・キッチン・洗面台の場所別に解説。髪の毛・油汚れ・固形物など原因別の対処法、パイプクリーナーの選び方と使用手順、業者を呼ぶ前に試すべき手順と、月1回でできるつまり予防メンテナンスをまとめています。"
updatedDate: 2026-04-05
relatedGroup: "diy-repair"
summary:
  - "場所と原因別に正しい方法を選べば、業者を呼ばずに自分でつまりを解消できる"
  - "パイプクリーナー（液体・錠剤）の使い分けと効果的な使用手順"
  - "高圧洗浄が必要な重症度の見極め方"
  - "月1回のメンテナンスでつまりをそもそも防ぐ方法"
```

#### floor-repair-paste
```yaml
title: "フローリングの深い傷・欠けを補修ペーストで直す方法と選び方"
description: "フローリングの深い傷・欠け・へこみを補修ペーストで目立たなくする方法を解説。木目の色合わせ方法、下地処理の手順、補修後のコーティング仕上げまで失敗しないポイントをまとめています。賃貸退去時の補修にも対応した商品選びのコツも紹介します。"
updatedDate: 2026-04-05
relatedGroup: "diy-repair"
summary:
  - "深い傷・欠け・へこみを補修ペーストで自分で目立たなくできる"
  - "木目の色合わせと下地処理の失敗しない手順"
  - "仕上げ（コーティング剤・ニス）で耐久性を上げる方法"
  - "賃貸退去時に使える補修グッズの選び方と注意点"
```

> **カニバリ差別化**: titleに「深い傷・欠け」を明記。浅い傷は `flooring-scratch` に誘導するリンクを記事末尾に追加すること（MDX本文に手動で追記）。

#### flooring-scratch
```yaml
title: "フローリングのすり傷・浅い傷を自分で直す方法と補修材の選び方"
description: "フローリングの細かいすり傷・表面の浅い傷は市販の補修マーカーや補修クレヨンで自分で直せます。傷の深さと色調別の補修材選び方、木目に合わせた色合わせのコツ、テスト貼りの手順、業者依頼すべき傷の見極め方まで失敗しない補修の全手順を解説します。"
updatedDate: 2026-04-05
relatedGroup: "diy-repair"
summary:
  - "すり傷・浅い傷なら補修マーカー1本で数百円・10分で目立たなくできる"
  - "傷の深さ別に補修マーカー・クレヨン・ペーストを正しく選ぶ方法"
  - "失敗しない色合わせのコツとテスト貼り手順"
```

> **カニバリ差別化**: titleに「すり傷・浅い傷」を明記。深い傷・欠けは `floor-repair-paste` に誘導するリンクを記事末尾に追加すること（MDX本文に手動で追記）。

#### rental-wall-repair
```yaml
title: "賃貸の壁穴・傷の補修方法と退去時の注意点"
description: "賃貸退去前に自分で壁穴・傷を補修する方法を解説。釘穴・画鋲穴・拳大の穴それぞれに使うパテや補修シールの選び方、クロスとの色合わせ、敷金を守るために知っておきたい国土交通省ガイドラインの自然損耗と入居者負担の境界線も詳しく紹介します。"
updatedDate: 2026-04-05
relatedGroup: "diy-repair"
summary:
  - "穴の大きさ別に正しい補修材を選ぶことで、退去費用を自力で抑えられる"
  - "釘穴・画鋲穴・拳大の穴それぞれのパテ埋め→色合わせ手順"
  - "国交省ガイドラインで自分が負担すべき傷かどうかを判断する方法"
  - "退去前に自分で補修すべき箇所の優先度判断フロー"
```

#### wallpaper-repair
```yaml
title: "壁紙の補修方法まとめ【剥がれ・破れ・穴の直し方と補修材選び】"
description: "壁紙の破れ・剥がれ・穴を自分で補修する方法を損傷の種類別に解説します。補修シール・のり・パテそれぞれの適切な使い分け方、既存クロスとの色・柄合わせのコツ、継ぎ目処理の手順、賃貸でも跡が残りにくい補修材の選び方まで網羅しています。"
updatedDate: 2026-04-05
relatedGroup: "diy-repair"
summary:
  - "損傷の種類（剥がれ・破れ・穴）に応じた補修材を選んで自分で直せる"
  - "補修シール・のり・パテの使い分け判断フロー"
  - "既存クロスとの色・柄合わせと継ぎ目を目立たせない処理のコツ"
```

> **カニバリ差別化**: この記事は「どの補修材を使うか判断する入口」。補修シールを選んだ場合は `wallpaper-repair-seal` へ誘導するリンクをMDX本文に手動追記すること。

#### wallpaper-repair-seal
```yaml
title: "壁紙補修シールの選び方と貼り方｜色合わせのコツと賃貸注意点"
description: "壁紙補修シールの色・柄の選び方ときれいに貼るコツを詳しく解説。白・オフホワイト・木目調など色合わせの手順、気泡が入らない貼り方と縁処理、賃貸退去時に使う際の注意点と国土交通省ガイドラインに基づく原状回復範囲の判断基準もまとめています。"
updatedDate: 2026-04-05
relatedGroup: "diy-repair"
summary:
  - "色合わせのコツを押さえれば、補修シール1枚で壁紙補修を目立たなくできる"
  - "白・オフホワイト・柄物それぞれの色合わせ手順と失敗しない選び方"
  - "気泡・浮きが出ない貼り方と縁処理の手順"
  - "賃貸退去時の原状回復範囲の判断基準"
```

> **カニバリ差別化**: この記事は「補修シールを使うと決めた後の詳細ガイド」。他の補修方法は `wallpaper-repair` へ誘導するリンクをMDX本文に手動追記すること。

#### car-scratch-repair
```yaml
title: "車の小傷を自分で直すDIY補修グッズとやり方【2026年版】"
description: "車ボディの小傷・すり傷をDIYで補修する方法を解説。コンパウンド・タッチアップペン・補修シートの使い分け、傷の深さ別（クリア層・塗装層・素地露出）の対処手順、塗装を傷めないコンパウンドの選び方と磨き方のコツ、業者依頼の判断基準も説明します。"
updatedDate: 2026-04-05
relatedGroup: "car-care"
summary:
  - "傷の深さ（クリア層・塗装層・素地露出）を見極めて、正しい補修材を選べる"
  - "コンパウンド・タッチアップペン・補修シートの具体的な使い分け方"
  - "色番号の調べ方と塗料の合わせ方"
  - "自力補修の限界と板金業者に依頼する判断基準"
```

#### headlight-polish
```yaml
title: "ヘッドライトの黄ばみを自分で磨く方法と磨き剤の選び方"
description: "ヘッドライトの黄ばみ・白濁の原因（UV劣化・酸化）と、コンパウンド・研磨剤・コーティング剤を使ったDIY磨き手順を解説。耐水ペーパー（#1000〜#3000）の使い方、磨き後のコーティングで黄ばみ再発を防ぐ方法、1〜2年で黄ばみが戻る原因と対策もまとめています。"
updatedDate: 2026-04-05
relatedGroup: "car-care"
summary:
  - "耐水ペーパー→コンパウンド→コーティングの手順で黄ばみを透明に戻せる"
  - "UV劣化・酸化の程度別、DIY対応できる黄ばみとプロ依頼が必要な状態の判断"
  - "磨き後のコーティングで1〜2年の再発防止を実現する方法"
```

#### tire-check-timing
```yaml
title: "タイヤ点検の時期とチェックポイント【溝・空気圧・ひび割れ】"
description: "タイヤの安全基準となる溝の深さ（法定限界1.6mm、実用限界4mm）の確認方法と、空気圧・ひび割れのセルフチェック手順を解説。タイヤの寿命目安（走行距離・製造年）、ガソリンスタンドと自宅での点検方法の違い、交換時期の判断基準もまとめています。"
updatedDate: 2026-04-05
relatedGroup: "car-care"
summary:
  - "溝の深さ（法定1.6mm・実用4mm）を自分で計測して交換時期を判断できる"
  - "空気圧・ひび割れ・偏摩耗のセルフチェック手順（月1回推奨）"
  - "製造年と走行距離からタイヤの寿命を計算する方法"
  - "スタンドと自宅での点検方法の違いとコスト比較"
```

#### winter-tire-timing
```yaml
title: "冬タイヤへの交換時期はいつ？地域別・気温別の目安"
description: "スタッドレスタイヤへの交換時期を、北海道・東北・関東甲信・西日本など地域別・気温別に解説。「気温7℃以下」を目安にした判断基準、交換を早めるべき天気予報の見方、スタッドレスタイヤの保管方法とグリップ性能の寿命（3〜4シーズン）もまとめています。"
updatedDate: 2026-04-05
relatedGroup: "car-care"
summary:
  - "地域別・気温別の交換目安を知ることで、初雪前に安全に対応できる"
  - "「気温7℃以下」を基準にした交換タイミング判断フロー"
  - "スタッドレスタイヤのグリップ寿命（3〜4シーズン）の見極め方"
  - "オフシーズンの正しい保管方法と劣化防止のコツ"
```

---

## 実装ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/content.config.ts` | `summary`・`relatedGroup` フィールド追加 |
| `src/pages/guide/[slug].astro` | summaryボックス・関連記事セクション（h3・descスニペット付き）追加 |
| `src/content/guide/*.mdx` × 12 | title・description・summary・relatedGroup・updatedDate 更新 |
| `src/content/guide/flooring-scratch.mdx` | 末尾に `floor-repair-paste` への誘導リンク手動追記 |
| `src/content/guide/floor-repair-paste.mdx` | 末尾に `flooring-scratch` への誘導リンク手動追記 |
| `src/content/guide/wallpaper-repair.mdx` | 末尾に `wallpaper-repair-seal` への誘導リンク手動追記 |
| `src/content/guide/wallpaper-repair-seal.mdx` | 末尾に `wallpaper-repair` への誘導リンク手動追記 |

---

## 完了条件

- [ ] `npx tsc --noEmit` エラーなし
- [ ] `npm test` 全件パス
- [ ] 全12記事でsummaryボックスが表示される（絵文字なし）
- [ ] 同グループ内の関連記事が pubDate 降順・最大3件表示される（自記事含まず）
- [ ] 関連記事カードに description スニペット（55文字）が表示される
- [ ] description がすべて120文字以上（実装後に文字数を計測して確認）
- [ ] カニバリゼーションペア（flooring・wallpaper）に相互誘導リンクがある
- [ ] 全12記事に `updatedDate: 2026-04-05` が設定されている
