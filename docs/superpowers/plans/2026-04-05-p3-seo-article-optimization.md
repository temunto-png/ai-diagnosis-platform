# P3: 既存12記事 SEO最適化 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存12記事の title/description最適化・summaryボックス追加・関連記事自動生成により、SEOと回遊率を向上させる。

**Architecture:** `content.config.ts` に `summary`・`relatedGroup` フィールドを追加し、`[slug].astro` でsummaryボックスと関連記事セクションをテンプレート側で自動描画する。全12記事のfrontmatterを更新し、カニバリゼーションペアに相互誘導リンクを追記する。

**Tech Stack:** Astro 6, TypeScript, Zod, MDX, Vitest

**設計書:** `docs/superpowers/specs/2026-04-05-p3-seo-article-optimization-design.md`

---

## ファイルマップ

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/content.config.ts` | Modify | `summary`・`relatedGroup` フィールド追加 |
| `src/pages/guide/[slug].astro` | Modify | summaryボックス・関連記事セクション追加 |
| `src/content/guide/black-mold-removal.mdx` | Modify | frontmatter更新 |
| `src/content/guide/mold-prevention-spray.mdx` | Modify | frontmatter更新 |
| `src/content/guide/drain-clog-removal.mdx` | Modify | frontmatter更新 |
| `src/content/guide/floor-repair-paste.mdx` | Modify | frontmatter更新 + 相互誘導リンク追記 |
| `src/content/guide/flooring-scratch.mdx` | Modify | frontmatter更新 + 相互誘導リンク追記 |
| `src/content/guide/rental-wall-repair.mdx` | Modify | frontmatter更新 |
| `src/content/guide/wallpaper-repair.mdx` | Modify | frontmatter更新 + 相互誘導リンク追記 |
| `src/content/guide/wallpaper-repair-seal.mdx` | Modify | frontmatter更新 + 相互誘導リンク追記 |
| `src/content/guide/car-scratch-repair.mdx` | Modify | frontmatter更新 |
| `src/content/guide/headlight-polish.mdx` | Modify | frontmatter更新 |
| `src/content/guide/tire-check-timing.mdx` | Modify | frontmatter更新 |
| `src/content/guide/winter-tire-timing.mdx` | Modify | frontmatter更新 |

---

## Task 1: スキーマ拡張（content.config.ts）

**Files:**
- Modify: `src/content.config.ts`

- [ ] **Step 1: `summary` と `relatedGroup` フィールドを追加する**

`src/content.config.ts` を以下に書き換える:

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const guide = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/guide" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string(),
    tags: z.array(z.string()),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
    howto: z.boolean().optional(),
    steps: z
      .array(
        z.object({
          name: z.string(),
          text: z.string(),
        })
      )
      .optional(),
    summary: z.array(z.string()).optional(),
    relatedGroup: z.string().optional(),
  }),
});

export const collections = { guide };
```

- [ ] **Step 2: 型チェックを実行して問題がないことを確認する**

```bash
npx tsc --noEmit
```

期待: エラーなし（警告のみは許容）

- [ ] **Step 3: コミットする**

```bash
git add src/content.config.ts
git commit -m "feat(schema): guide に summary・relatedGroup フィールドを追加"
```

---

## Task 2: テンプレート変更（[slug].astro）

**Files:**
- Modify: `src/pages/guide/[slug].astro`

- [ ] **Step 1: `getCollection` で全記事を取得し、関連記事フィルタ変数を追加する**

`[slug].astro` のスクリプト部分（`---` 内）を以下に変更する。
既存の `import` と `getEntry`・`render` はそのまま維持し、以下を追記する:

```astro
---
import Base from "../../layouts/Base.astro";
import AdUnit from "../../components/AdUnit.astro";
import SchemaOrg from "../../components/SchemaOrg.astro";
import DiagnosisCTA from "../../components/DiagnosisCTA.astro";
import { getCollection, getEntry, render } from "astro:content";

export const prerender = true;

export async function getStaticPaths() {
  const articles = await getCollection("guide");
  return articles.map((entry) => ({ params: { slug: entry.id } }));
}

const { slug } = Astro.params;
const entry = await getEntry("guide", slug!);
if (!entry) return Astro.redirect("/404");

const { Content } = await render(entry);

const kabiCategories = ["カビ対策", "水回りDIY"];
const diagnosisType = kabiCategories.includes(entry.data.category)
  ? "kabi-diagnosis"
  : "diy-repair";
const diagnosisHref = entry.id.includes("kabi") || entry.id.includes("mold")
  ? "/kabi-diagnosis/"
  : "/diy-repair/";

// 関連記事: 同 relatedGroup・pubDate 降順・自記事除外・最大3件
const allArticles = await getCollection("guide");
const related = entry.data.relatedGroup
  ? allArticles
      .filter(
        (a) =>
          a.data.relatedGroup === entry.data.relatedGroup && a.id !== entry.id
      )
      .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
      .slice(0, 3)
  : [];
---
```

- [ ] **Step 2: summaryボックスを article-header 直後に挿入する**

`<header class="article-header">` ブロックの閉じタグ `</header>` の直後、`<DiagnosisCTA>` の前に追記する:

```astro
    {entry.data.summary && (
      <div class="article-summary">
        <p class="article-summary-title">この記事でわかること</p>
        <ul>
          {entry.data.summary.map((item) => <li>{item}</li>)}
        </ul>
      </div>
    )}
```

- [ ] **Step 3: 関連記事セクションを nav の直前に挿入する**

`<nav class="article-back">` の直前に追記する:

```astro
    {related.length > 0 && (
      <section class="related-articles">
        <h3>関連記事</h3>
        <ul>
          {related.map((a) => (
            <li>
              <a href={`/guide/${a.id}/`}>
                <span class="related-category">{a.data.category}</span>
                <span class="related-title">{a.data.title}</span>
                <span class="related-desc">
                  {a.data.description.slice(0, 55)}…
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    )}
```

- [ ] **Step 4: summaryボックスと関連記事のスタイルを `<style>` ブロックに追加する**

既存の `<style>` ブロック内の `.article-meta-note` の後ろに追記する:

```css
.article-summary {
  background: var(--bg-alt);
  border-left: 3px solid var(--primary);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
}
.article-summary-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9375rem;
  margin: 0 0 0.5rem;
  color: var(--primary);
}
.article-summary ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.article-summary li {
  font-size: 0.875rem;
  line-height: 1.6;
  padding: 0.2rem 0;
  color: var(--text);
}
.article-summary li::before {
  content: "✓ ";
  color: var(--primary);
  font-weight: 700;
}

.related-articles {
  margin: 2.5rem 0 1.5rem;
  padding-top: 1.5rem;
  border-top: 1.5px solid var(--border);
}
.related-articles h3 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--text);
}
.related-articles ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.related-articles li a {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.875rem 1rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: border-color 0.15s;
}
.related-articles li a:hover {
  border-color: var(--primary);
}
.related-category {
  display: inline-block;
  background: var(--primary);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  border-radius: 2rem;
  align-self: flex-start;
}
.related-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}
.related-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}
```

- [ ] **Step 5: Astro 型チェックと TypeScript チェックを実行する**

```bash
npx astro check && npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 6: テストを実行して既存テストが壊れていないことを確認する**

```bash
npm test
```

期待: 全件パス

- [ ] **Step 7: コミットする**

```bash
git add src/pages/guide/[slug].astro
git commit -m "feat(template): guide記事にsummaryボックスと関連記事セクションを追加"
```

---

## Task 3: kabiグループ記事のfrontmatter更新

**Files:**
- Modify: `src/content/guide/black-mold-removal.mdx`
- Modify: `src/content/guide/mold-prevention-spray.mdx`

- [ ] **Step 1: `black-mold-removal.mdx` の frontmatter を更新する**

`---` から `---` までのブロックを以下に置き換える（howto/steps/faqは現行を維持）:

```yaml
---
title: "黒カビの落とし方と最強洗剤の選び方【浴室・押入れ・壁】"
description: "黒カビ（クロカビ）の効果的な除去方法を、浴室・押入れ・壁クロス別に詳しく解説。塩素系・アルコール系・重曹の使い分け基準から、作業時の安全注意事項、再発を防ぐ防カビスプレーの使い方まで完全網羅します。"
pubDate: 2026-03-22
updatedDate: 2026-04-05
category: "カビ対策"
tags: ["黒カビ", "カビ取り", "浴室", "洗剤"]
relatedGroup: "kabi"
summary:
  - "素材を傷めずカビを根こそぎ除去できる洗剤3種の選び方"
  - "浴室・押入れ・壁クロス別、15分でできる除去手順"
  - "混ぜると危険な組み合わせと、保護具・換気の安全対策"
  - "再発を防ぐ防カビスプレーと換気ルーティン"
faq:
  - question: "黒カビを自分で除去できますか？"
    answer: "軽度〜中度の黒カビは市販の塩素系カビ取り剤（カビキラーなど）で自分で除去できます。ただし広範囲・重度の場合や天井・押入れ奥の場合は専門業者への相談を推奨します。"
  - question: "黒カビと白カビの違いは何ですか？"
    answer: "黒カビ（クロカビ）は湿度の高い水回りに多く、健康被害のリスクが高い種類です。白カビは発生初期に多く見られ、比較的除去しやすいですが放置すると黒カビに変化することがあります。いずれも早期対処が重要です。"
  - question: "カビ取り後に再発しないようにするには？"
    answer: "カビ除去後は防カビスプレーを塗布し、湿度を60%以下に保つことが再発防止の基本です。浴室は使用後に冷水をかけて温度を下げ、換気扇を30分以上回す習慣をつけましょう。"
  - question: "塩素系カビ取り剤を使うときの注意点は？"
    answer: "塩素系カビ取り剤は必ず換気した状態で使用し、ゴム手袋・防護メガネを着用してください。酸性洗剤（クエン酸、トイレ用洗剤など）と混合すると有毒ガスが発生するため、絶対に混ぜないでください。"
howto: true
steps:
  - name: "換気する"
    text: "窓を開け換気扇を回して十分に換気する。塩素系洗剤を使う場合は必須。"
  - name: "保護具を着用する"
    text: "ゴム手袋と防護メガネを着用し、皮膚・目への飛沫を防ぐ。"
  - name: "カビ取り剤を塗布する"
    text: "カビ部分にカビキラーなどの塩素系スプレーを直接吹きかけ、広範囲はラップで密着させる。"
  - name: "15〜30分放置する"
    text: "カビ取り剤が浸透するよう15〜30分放置する。頑固なカビはラップ湿布で30分。"
  - name: "洗い流す"
    text: "水またはシャワーで十分に洗い流し、洗剤が残らないようにする。"
  - name: "乾燥させる"
    text: "タオルで拭き取り、換気扇で完全に乾燥させる。"
---
```

- [ ] **Step 2: `mold-prevention-spray.mdx` の frontmatter を更新する**

`---` から `---` までのブロックの `title`・`description` および `updatedDate`・`relatedGroup`・`summary` を追加。faqは現行を維持:

```yaml
---
title: "カビ防止スプレーの選び方と効果的な使い方【場所別・2026年版】"
description: "浴室・押入れ・エアコン・靴箱など場所別にカビ防止スプレーのおすすめ商品と選び方を比較。防カビ効果が持続する最適な塗布タイミング、下地処理の手順、塩素系・アルコール系・天然由来タイプの違い、防カビシートとの使い分けポイントをまとめています。"
pubDate: 2026-01-10
updatedDate: 2026-04-05
category: "カビ対策"
tags: ["カビ防止", "スプレー", "浴室", "押入れ"]
relatedGroup: "kabi"
summary:
  - "場所別（浴室・押入れ・靴箱）に正しいスプレーを選んでカビを長期予防できる"
  - "防カビ効果が最大化する塗布タイミングと下地処理の手順"
  - "塩素系・アルコール系・天然由来タイプの使い分けと安全注意"
faq:
  - question: "カビ防止スプレーはカビ取りにも使えますか？"
    answer: "カビ防止スプレーはカビの発生を予防する製品で、すでに生えているカビを除去する効果はありません。まず塩素系カビ取り剤でカビを除去し、完全に乾燥させてからカビ防止スプレーを使用してください。"
  - question: "カビ防止スプレーの効果はどのくらい続きますか？"
    answer: "製品により異なりますが、浴室用は1〜3ヶ月、押入れ・クローゼット用は3〜6ヶ月が目安です。湿気が多い梅雨時期は効果が短くなるため、定期的な再塗布を推奨します。"
  - question: "子どもやペットがいる家庭でも安全に使えますか？"
    answer: "使用後は十分に換気し、完全に乾燥するまで触れないようにしてください。乾燥後は安全性の高い製品が多いですが、食品棚や玩具に直接触れる場所への使用は避けてください。製品の使用上の注意を必ず確認してください。"
  - question: "浴室と押入れで同じカビ防止スプレーを使っていいですか？"
    answer: "浴室用は水回りの高湿度・水洗いに対応した成分、押入れ・クローゼット用は布・木材に優しい成分を使っています。効果を最大化するために場所別の専用品を使い分けることを推奨します。"
---
```

- [ ] **Step 3: 型チェックとテストを実行する**

```bash
npx tsc --noEmit && npm test
```

期待: エラーなし、全件パス

- [ ] **Step 4: コミットする**

```bash
git add src/content/guide/black-mold-removal.mdx src/content/guide/mold-prevention-spray.mdx
git commit -m "content(kabi): black-mold-removal・mold-prevention-spray frontmatter更新"
```

---

## Task 4: diy-repairグループ記事更新（前半: drain・flooring系）

**Files:**
- Modify: `src/content/guide/drain-clog-removal.mdx`
- Modify: `src/content/guide/floor-repair-paste.mdx`
- Modify: `src/content/guide/flooring-scratch.mdx`

- [ ] **Step 1: `drain-clog-removal.mdx` の frontmatter を更新する**

`---`〜`---` ブロックの `title`・`description`・`updatedDate`・`relatedGroup`・`summary` を以下に変更。faq/howto/stepsは現行維持:

```yaml
title: "排水口のつまりを自分で解消する方法【浴室・キッチン・洗面台】"
description: "排水口のつまりを自分で解消する方法を、浴室・キッチン・洗面台の場所別に解説。髪の毛・油汚れ・固形物など原因別の対処法、パイプクリーナーの選び方と使用手順、業者を呼ぶ前に試すべき手順と、月1回でできるつまり予防メンテナンスをまとめています。"
pubDate: 2026-02-14
updatedDate: 2026-04-05
category: "水回りDIY"
tags: ["排水口", "つまり", "詰まり", "DIY", "水回り"]
relatedGroup: "diy-repair"
summary:
  - "場所と原因別に正しい方法を選べば、業者を呼ばずに自分でつまりを解消できる"
  - "パイプクリーナー（液体・錠剤）の使い分けと効果的な使用手順"
  - "高圧洗浄が必要な重症度の見極め方"
  - "月1回のメンテナンスでつまりをそもそも防ぐ方法"
```

- [ ] **Step 2: `floor-repair-paste.mdx` の frontmatter を更新する**

```yaml
title: "フローリングの深い傷・欠けを補修ペーストで直す方法と選び方"
description: "フローリングの深い傷・欠け・へこみを補修ペーストで目立たなくする方法を解説。木目の色合わせ方法、下地処理の手順、補修後のコーティング仕上げまで失敗しないポイントをまとめています。賃貸退去時の補修にも対応した商品選びのコツも紹介します。"
pubDate: 2026-02-20
updatedDate: 2026-04-05
category: "DIY補修"
tags: ["フローリング", "補修ペースト", "DIY", "床"]
relatedGroup: "diy-repair"
summary:
  - "深い傷・欠け・へこみを補修ペーストで自分で目立たなくできる"
  - "木目の色合わせと下地処理の失敗しない手順"
  - "仕上げ（コーティング剤・ニス）で耐久性を上げる方法"
  - "賃貸退去時に使える補修グッズの選び方と注意点"
```

- [ ] **Step 3: `floor-repair-paste.mdx` の本文末尾に `flooring-scratch` への誘導リンクを追記する**

既存の `[AI補修診断ツールを使う（無料）](/diy-repair/)` の直前に以下を挿入:

```markdown
表面のすり傷・浅い引っかき傷であれば、補修マーカーで手軽に対応できます。傷の深さを確認してから補修材を選んでください。

[フローリングのすり傷・浅い傷の直し方はこちら](/guide/flooring-scratch/)
```

- [ ] **Step 4: `flooring-scratch.mdx` の frontmatter を更新する**

```yaml
title: "フローリングのすり傷・浅い傷を自分で直す方法と補修材の選び方"
description: "フローリングの細かいすり傷・表面の浅い傷は市販の補修マーカーや補修クレヨンで自分で直せます。傷の深さと色調別の補修材選び方、木目に合わせた色合わせのコツ、テスト貼りの手順、業者依頼すべき傷の見極め方まで失敗しない補修の全手順を解説します。"
pubDate: 2026-01-25
updatedDate: 2026-04-05
category: "DIY補修"
tags: ["フローリング", "傷", "補修", "DIY"]
relatedGroup: "diy-repair"
summary:
  - "すり傷・浅い傷なら補修マーカー1本で数百円・10分で目立たなくできる"
  - "傷の深さ別に補修マーカー・クレヨン・ペーストを正しく選ぶ方法"
  - "失敗しない色合わせのコツとテスト貼り手順"
```

- [ ] **Step 5: `flooring-scratch.mdx` の本文末尾に `floor-repair-paste` への誘導リンクを追記する**

既存の `[AI補修診断ツールを使う（無料）](/diy-repair/)` の直前に以下を挿入:

```markdown
欠けや深いへこみがある場合は、補修ペーストを使った方法が適しています。

[フローリングの深い傷・欠けの補修方法はこちら](/guide/floor-repair-paste/)
```

- [ ] **Step 6: 型チェックとテストを実行する**

```bash
npx tsc --noEmit && npm test
```

期待: エラーなし、全件パス

- [ ] **Step 7: コミットする**

```bash
git add src/content/guide/drain-clog-removal.mdx src/content/guide/floor-repair-paste.mdx src/content/guide/flooring-scratch.mdx
git commit -m "content(diy): drain-clog・floor-repair-paste・flooring-scratch frontmatter更新・相互リンク追加"
```

---

## Task 5: diy-repairグループ記事更新（後半: rental・wallpaper系）

**Files:**
- Modify: `src/content/guide/rental-wall-repair.mdx`
- Modify: `src/content/guide/wallpaper-repair.mdx`
- Modify: `src/content/guide/wallpaper-repair-seal.mdx`

- [ ] **Step 1: `rental-wall-repair.mdx` の frontmatter を更新する**

faq/howto/stepsは現行維持:

```yaml
title: "賃貸の壁穴・傷の補修方法と退去時の注意点"
description: "賃貸退去前に自分で壁穴・傷を補修する方法を解説。釘穴・画鋲穴・拳大の穴それぞれに使うパテや補修シールの選び方、クロスとの色合わせ、敷金を守るために知っておきたい国土交通省ガイドラインの自然損耗と入居者負担の境界線も詳しく紹介します。"
pubDate: 2026-02-05
updatedDate: 2026-04-05
category: "DIY補修"
tags: ["賃貸", "壁穴", "補修", "退去", "DIY"]
relatedGroup: "diy-repair"
summary:
  - "穴の大きさ別に正しい補修材を選ぶことで、退去費用を自力で抑えられる"
  - "釘穴・画鋲穴・拳大の穴それぞれのパテ埋め→色合わせ手順"
  - "国交省ガイドラインで自分が負担すべき傷かどうかを判断する方法"
  - "退去前に自分で補修すべき箇所の優先度判断フロー"
```

- [ ] **Step 2: `wallpaper-repair.mdx` の frontmatter を更新する**

faq/howto/stepsは現行維持:

```yaml
title: "壁紙の補修方法まとめ【剥がれ・破れ・穴の直し方と補修材選び】"
description: "壁紙の破れ・剥がれ・穴を自分で補修する方法を損傷の種類別に解説します。補修シール・のり・パテそれぞれの適切な使い分け方、既存クロスとの色・柄合わせのコツ、継ぎ目処理の手順、賃貸でも跡が残りにくい補修材の選び方まで網羅しています。"
pubDate: 2025-11-18
updatedDate: 2026-04-05
category: "DIY補修"
tags: ["壁紙", "補修", "DIY", "賃貸"]
relatedGroup: "diy-repair"
summary:
  - "損傷の種類（剥がれ・破れ・穴）に応じた補修材を選んで自分で直せる"
  - "補修シール・のり・パテの使い分け判断フロー"
  - "既存クロスとの色・柄合わせと継ぎ目を目立たせない処理のコツ"
```

- [ ] **Step 3: `wallpaper-repair.mdx` の本文末尾に `wallpaper-repair-seal` への誘導リンクを追記する**

既存の `[AI補修診断ツールを使う（無料）](/diy-repair/)` の直前に以下を挿入:

```markdown
補修シールを使うと決めた場合は、色合わせのコツと貼り方の詳細を確認してください。

[壁紙補修シールの選び方・貼り方はこちら](/guide/wallpaper-repair-seal/)
```

- [ ] **Step 4: `wallpaper-repair-seal.mdx` の frontmatter を更新する**

faqは現行維持:

```yaml
title: "壁紙補修シールの選び方と貼り方｜色合わせのコツと賃貸注意点"
description: "壁紙補修シールの色・柄の選び方ときれいに貼るコツを詳しく解説。白・オフホワイト・木目調など色合わせの手順、気泡が入らない貼り方と縁処理、賃貸退去時に使う際の注意点と国土交通省ガイドラインに基づく原状回復範囲の判断基準もまとめています。"
pubDate: 2026-01-15
updatedDate: 2026-04-05
category: "DIY補修"
tags: ["壁紙", "補修シール", "DIY", "賃貸"]
relatedGroup: "diy-repair"
summary:
  - "色合わせのコツを押さえれば、補修シール1枚で壁紙補修を目立たなくできる"
  - "白・オフホワイト・柄物それぞれの色合わせ手順と失敗しない選び方"
  - "気泡・浮きが出ない貼り方と縁処理の手順"
  - "賃貸退去時の原状回復範囲の判断基準"
```

- [ ] **Step 5: `wallpaper-repair-seal.mdx` の本文末尾に `wallpaper-repair` への誘導リンクを追記する**

既存の `[AI補修診断ツールを使う（無料）](/diy-repair/)` の直前に以下を挿入:

```markdown
のり・パテを使った補修方法や、どの補修材を選ぶかの判断フローは以下をご参照ください。

[壁紙の剥がれ・破れ・穴の補修方法まとめ](/guide/wallpaper-repair/)
```

- [ ] **Step 6: 型チェックとテストを実行する**

```bash
npx tsc --noEmit && npm test
```

期待: エラーなし、全件パス

- [ ] **Step 7: コミットする**

```bash
git add src/content/guide/rental-wall-repair.mdx src/content/guide/wallpaper-repair.mdx src/content/guide/wallpaper-repair-seal.mdx
git commit -m "content(diy): rental-wall-repair・wallpaper系 frontmatter更新・相互リンク追加"
```

---

## Task 6: car-careグループ記事のfrontmatter更新

**Files:**
- Modify: `src/content/guide/car-scratch-repair.mdx`
- Modify: `src/content/guide/headlight-polish.mdx`
- Modify: `src/content/guide/tire-check-timing.mdx`
- Modify: `src/content/guide/winter-tire-timing.mdx`

- [ ] **Step 1: `car-scratch-repair.mdx` の frontmatter を更新する**

faqは現行維持:

```yaml
title: "車の小傷を自分で直すDIY補修グッズとやり方【2026年版】"
description: "車ボディの小傷・すり傷をDIYで補修する方法を解説。コンパウンド・タッチアップペン・補修シートの使い分け、傷の深さ別（クリア層・塗装層・素地露出）の対処手順、塗装を傷めないコンパウンドの選び方と磨き方のコツ、業者依頼の判断基準も説明します。"
pubDate: 2026-01-20
updatedDate: 2026-04-05
category: "カーケア"
tags: ["車", "傷", "補修", "DIY", "ボディ"]
relatedGroup: "car-care"
summary:
  - "傷の深さ（クリア層・塗装層・素地露出）を見極めて、正しい補修材を選べる"
  - "コンパウンド・タッチアップペン・補修シートの具体的な使い分け方"
  - "色番号の調べ方と塗料の合わせ方"
  - "自力補修の限界と板金業者に依頼する判断基準"
```

- [ ] **Step 2: `headlight-polish.mdx` の frontmatter を更新する**

faqは現行維持:

```yaml
title: "ヘッドライトの黄ばみを自分で磨く方法と磨き剤の選び方"
description: "ヘッドライトの黄ばみ・白濁の原因（UV劣化・酸化）と、コンパウンド・研磨剤・コーティング剤を使ったDIY磨き手順を解説。耐水ペーパー（#1000〜#3000）の使い方、磨き後のコーティングで黄ばみ再発を防ぐ方法、1〜2年で黄ばみが戻る原因と対策もまとめています。"
pubDate: 2026-02-08
updatedDate: 2026-04-05
category: "カーケア"
tags: ["ヘッドライト", "黄ばみ", "磨き", "コンパウンド", "DIY", "車"]
relatedGroup: "car-care"
summary:
  - "耐水ペーパー→コンパウンド→コーティングの手順で黄ばみを透明に戻せる"
  - "UV劣化・酸化の程度別、DIY対応できる黄ばみとプロ依頼が必要な状態の判断"
  - "磨き後のコーティングで1〜2年の再発防止を実現する方法"
```

- [ ] **Step 3: `tire-check-timing.mdx` の frontmatter を更新する**

faqは現行維持:

```yaml
title: "タイヤ点検の時期とチェックポイント【溝・空気圧・ひび割れ】"
description: "タイヤの安全基準となる溝の深さ（法定限界1.6mm、実用限界4mm）の確認方法と、空気圧・ひび割れのセルフチェック手順を解説。タイヤの寿命目安（走行距離・製造年）、ガソリンスタンドと自宅での点検方法の違い、交換時期の判断基準もまとめています。"
pubDate: 2026-01-30
updatedDate: 2026-04-05
category: "カーケア"
tags: ["タイヤ", "溝", "交換時期", "車"]
relatedGroup: "car-care"
summary:
  - "溝の深さ（法定1.6mm・実用4mm）を自分で計測して交換時期を判断できる"
  - "空気圧・ひび割れ・偏摩耗のセルフチェック手順（月1回推奨）"
  - "製造年と走行距離からタイヤの寿命を計算する方法"
  - "スタンドと自宅での点検方法の違いとコスト比較"
```

- [ ] **Step 4: `winter-tire-timing.mdx` の frontmatter を更新する**

faqは現行維持:

```yaml
title: "冬タイヤへの交換時期はいつ？地域別・気温別の目安"
description: "スタッドレスタイヤへの交換時期を、北海道・東北・関東甲信・西日本など地域別・気温別に解説。「気温7℃以下」を目安にした判断基準、交換を早めるべき天気予報の見方、スタッドレスタイヤの保管方法とグリップ性能の寿命（3〜4シーズン）もまとめています。"
pubDate: 2026-01-05
updatedDate: 2026-04-05
category: "カーケア"
tags: ["スタッドレス", "冬タイヤ", "交換時期", "車"]
relatedGroup: "car-care"
summary:
  - "地域別・気温別の交換目安を知ることで、初雪前に安全に対応できる"
  - "「気温7℃以下」を基準にした交換タイミング判断フロー"
  - "スタッドレスタイヤのグリップ寿命（3〜4シーズン）の見極め方"
  - "オフシーズンの正しい保管方法と劣化防止のコツ"
```

- [ ] **Step 5: 型チェックとテストを実行する**

```bash
npx tsc --noEmit && npm test
```

期待: エラーなし、全件パス

- [ ] **Step 6: コミットする**

```bash
git add src/content/guide/car-scratch-repair.mdx src/content/guide/headlight-polish.mdx src/content/guide/tire-check-timing.mdx src/content/guide/winter-tire-timing.mdx
git commit -m "content(car-care): car-scratch・headlight・tire系 frontmatter更新"
```

---

## Task 7: 最終検証

- [ ] **Step 1: 全件の型チェック・テストを実行する**

```bash
npx astro check && npx tsc --noEmit && npm test
```

期待: エラーなし、全件パス

- [ ] **Step 2: description の文字数を全件確認する（120文字以上）**

```bash
cd "src/content/guide" && grep "^description:" *.mdx | while IFS=: read file key val; do len=$(echo "$val" | tr -d '"' | wc -c); echo "$len $file"; done | sort -n
```

期待: 全件 120 以上。120未満のものがあれば、該当記事の description を追加で拡張する。

- [ ] **Step 3: relatedGroup が全12記事に設定されているか確認する**

```bash
grep -L "relatedGroup" src/content/guide/*.mdx
```

期待: 出力なし（全記事に設定済み）

- [ ] **Step 4: updatedDate が全12記事に設定されているか確認する**

```bash
grep -L "updatedDate" src/content/guide/*.mdx
```

期待: 出力なし（全記事に設定済み）

- [ ] **Step 5: ローカル開発サーバーで動作確認する**

```bash
npm run dev
```

以下を確認する:
- `/guide/black-mold-removal/` で summaryボックスが表示される
- `/guide/black-mold-removal/` で関連記事（mold-prevention-spray・drain-clog-removal）が表示される（自記事が含まれていないこと）
- `/guide/flooring-scratch/` に `floor-repair-paste` への誘導リンクがある
- `/guide/wallpaper-repair/` に `wallpaper-repair-seal` への誘導リンクがある

- [ ] **Step 6: PR を作成する**

```bash
git push origin claude/epic-taussig
gh pr create \
  --title "feat(P3): 既存12記事 SEO最適化（summary・関連記事・description拡充）" \
  --body "$(cat <<'EOF'
## Summary
- 全12記事に `summary`（この記事でわかること）ボックスを追加（ベネフィット表現）
- 同グループ記事を自動表示する「関連記事」セクションを `[slug].astro` に追加（pubDate降順・最大3件・descriptionスニペット付き）
- 全12記事の `description` を120文字以上に拡充、`updatedDate: 2026-04-05` を追加
- flooring・wallpaper カニバリゼーションペアに相互誘導リンクを追記
- `drain-clog-removal` の `relatedGroup` を `kabi` → `diy-repair` に変更

## Test plan
- [ ] `npx astro check && npx tsc --noEmit` エラーなし
- [ ] `npm test` 全件パス
- [ ] 全12記事でsummaryボックスが表示される
- [ ] 関連記事が自記事を含まず最大3件表示される
- [ ] flooring・wallpaper ペアに相互誘導リンクがある

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 完了条件チェックリスト

- [ ] `npx tsc --noEmit` エラーなし
- [ ] `npm test` 全件パス
- [ ] 全12記事でsummaryボックスが表示される（絵文字なし）
- [ ] 同グループ内の関連記事が pubDate 降順・最大3件表示される（自記事含まず）
- [ ] 関連記事カードに description スニペット（55文字）が表示される
- [ ] description がすべて120文字以上
- [ ] カニバリゼーションペア（flooring・wallpaper）に相互誘導リンクがある
- [ ] 全12記事に `updatedDate: 2026-04-05` が設定されている
