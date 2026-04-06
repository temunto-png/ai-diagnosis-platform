# P5 ピラーページ実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** カビ完全ガイド・DIY修理完全ガイドの2本のピラーページを作成し、`/guide/` インデックスの先頭に表示する。

**Architecture:** 既存の `[slug].astro` テンプレートを参考に、ピラーページごとに独立した静的 Astro ファイルを作成する。`getCollection` には頼らず、記事カードはハードコードする。`guide/index.astro` に手動で2枚のピラーカードを先頭追加する。

**Tech Stack:** Astro 6 (SSR + prerender), SchemaOrg / DiagnosisCTA / AdUnit コンポーネント, Scoped CSS

---

## ファイル一覧

| 操作 | パス |
|------|------|
| Create | `src/pages/guide/kabi-complete-guide.astro` |
| Create | `src/pages/guide/diy-repair-complete-guide.astro` |
| Modify | `src/pages/guide/index.astro` |

---

## Task 1: カビ完全ガイドページを作成

**Files:**
- Create: `src/pages/guide/kabi-complete-guide.astro`

- [ ] **Step 1: ファイルを作成する**

`src/pages/guide/kabi-complete-guide.astro` を以下の内容で作成する：

```astro
---
import Base from "../../layouts/Base.astro";
import AdUnit from "../../components/AdUnit.astro";
import SchemaOrg from "../../components/SchemaOrg.astro";
import DiagnosisCTA from "../../components/DiagnosisCTA.astro";
import { SITE_URL } from "../../lib/site";

export const prerender = true;

const title = "カビ完全ガイド｜種類・原因・除去・予防を徹底解説";
const description = "浴室・押入れ・壁に発生するカビの原因と健康リスク、自分でできる除去方法から再発防止策まで完全解説。黒カビ・白カビの違い、塩素系・アルコール系洗剤の使い分け、専門業者に依頼すべき状態の見極め方も。";
const pubDate = new Date("2026-04-06");

const summary = [
  "カビが繁殖する温湿度条件と健康リスクの全体像",
  "場所別・カビの種類別に選ぶ洗剤の使い分け方法",
  "自分でできる除去と業者依頼が必要なケースの見極め方",
  "再発を防ぐ防カビスプレーと換気ルーティン",
];

const faq = [
  {
    question: "カビは自分で除去できますか？",
    answer: "軽度〜中度のカビは市販の塩素系・アルコール系洗剤で対応できます。広範囲（1㎡以上）・重度・天井・健康被害がある場合は専門業者への依頼を推奨します。",
  },
  {
    question: "カビが健康に与える影響は？",
    answer: "カビの胞子を吸い込むとアレルギー・喘息・皮膚炎を引き起こすことがあります。免疫が低下した方・子ども・高齢者は特に注意が必要です。",
  },
  {
    question: "カビの再発を防ぐには？",
    answer: "除去後に防カビスプレーを塗布し、湿度を60%以下に保つことが基本です。毎日の換気（10〜15分）と月1回の浴室乾燥を習慣化することで再発率を大幅に下げられます。",
  },
  {
    question: "業者に依頼した場合の費用目安は？",
    answer: "浴室1箇所のカビ除去は1〜3万円が目安です。広範囲・壁内部・天井に及ぶ場合は5〜15万円以上になることもあります。まず無料見積もりで確認することをお勧めします。",
  },
];
---

<Base {title} {description}>
  <SchemaOrg
    slot="head"
    type="article"
    {title}
    {description}
    pubDate={pubDate}
    url={`${SITE_URL}/guide/kabi-complete-guide/`}
    {faq}
  />

  <article class="article-page">
    <header class="article-header">
      <h1 class="article-title">{title}</h1>
      <time class="article-date" datetime={pubDate.toISOString()}>
        公開: {pubDate.toLocaleDateString("ja-JP")}
      </time>
    </header>

    <div class="article-summary">
      <p class="article-summary-title">この記事でわかること</p>
      <ul>
        {summary.map((item) => <li>{item}</li>)}
      </ul>
    </div>

    <DiagnosisCTA diagnosisType="kabi-diagnosis" variant="top" />

    <section class="pillar-section">
      <h2>カビが発生する原因と健康リスク</h2>
      <p class="pillar-section-intro">
        カビは「温度20〜30℃・湿度70%以上・有機物（ホコリ・石鹸カス・木材など）」の三条件が揃うと急速に繁殖します。浴室・押入れ・窓周りは特に条件が重なりやすい場所です。カビの胞子を継続的に吸い込むと、アレルギー性鼻炎・喘息・気管支炎を引き起こすほか、免疫が低下した方には肺炎のリスクもあります。建材へのダメージも深刻で、放置するとクロスや木部が腐食し修繕費用が増大します。早期発見・早期対処が最も費用対効果の高い選択です。
      </p>
    </section>

    <section class="pillar-section">
      <h2>黒カビの除去方法</h2>
      <p class="pillar-section-intro">
        黒カビ（クロカビ）の除去には塩素系・アルコール系・重曹の3種類の洗剤を使い分けます。浴室タイルや洗面台には塩素系（カビキラーなど）が最も効果的で、根まで除菌できます。木材・押入れにはアルコール系が適し、素材を傷めずに除菌できます。食品が近い場所や自然素材には重曹が安全です。作業時は換気とゴム手袋が必須で、塩素系洗剤と酸性洗剤の混合は有毒ガスが発生するため厳禁です。
      </p>
      <div class="pillar-card-grid">
        <a href="/guide/black-mold-removal/" class="pillar-card">
          <span class="pillar-card-category">カビ対策</span>
          <span class="pillar-card-title">黒カビの落とし方と最強洗剤の選び方【浴室・押入れ・壁】</span>
          <span class="pillar-card-desc">黒カビの除去方法を浴室・押入れ・壁クロス別に解説。塩素系・アルコール系・重曹の使い分けと安全対策…</span>
        </a>
      </div>
    </section>

    <section class="pillar-section">
      <h2>カビの予防・防止策</h2>
      <p class="pillar-section-intro">
        カビの再発を防ぐには、除去後の防カビスプレー塗布と日常的な湿度管理が鍵です。防カビスプレーは塩素系（除菌効果）・アルコール系（食品周り）・天然由来（子ども部屋）の3タイプがあり、場所によって使い分けます。効果が最大化するのは、カビ除去直後の乾燥状態で塗布したときです。また、浴室は使用後に冷水シャワーで温度を下げ、換気扇を30分以上回す習慣が最も手軽な予防策です。
      </p>
      <div class="pillar-card-grid">
        <a href="/guide/mold-prevention-spray/" class="pillar-card">
          <span class="pillar-card-category">カビ対策</span>
          <span class="pillar-card-title">カビ防止スプレーの選び方と効果的な使い方【場所別・2026年版】</span>
          <span class="pillar-card-desc">浴室・押入れ・エアコン・靴箱など場所別にカビ防止スプレーの選び方と塗布タイミングを解説…</span>
        </a>
      </div>
    </section>

    <AdUnit slot={import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_MID} />

    <section class="pillar-section">
      <h2>専門業者に依頼すべきケース</h2>
      <p class="pillar-section-intro">
        次のケースはDIY対処ではなく専門業者への依頼を推奨します。①カビの面積が1㎡以上の広範囲、②天井や壁の内部（クロス下）に浸透している疑いがある、③咳・目のかゆみなど健康被害がすでに出ている、④除去しても2週間以内に再発する。プロのハウスクリーニングは浴室1箇所1〜3万円が相場です。写真をAIに診断させると重症度を素早く判断できます。
      </p>
      <DiagnosisCTA diagnosisType="kabi-diagnosis" variant="bottom" />
    </section>

    <AdUnit slot={import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM} />

    <nav class="article-back">
      <a href="/guide/">ガイド一覧に戻る</a>
    </nav>
  </article>
</Base>

<style>
.article-summary {
  background: var(--bg-alt);
  border-left: 3px solid var(--primary);
  border-radius: 0 var(--radius) var(--radius) 0;
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
.pillar-section { margin: 2.5rem 0; }
.pillar-section-intro {
  font-size: 0.9375rem;
  line-height: 1.75;
  color: var(--text);
  margin-bottom: 1.25rem;
}
.pillar-card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
@media (max-width: 540px) {
  .pillar-card-grid { grid-template-columns: 1fr; }
}
.pillar-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.875rem 1rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  transition: border-color 0.15s;
}
.pillar-card:hover { border-color: var(--primary); }
.pillar-card-category {
  display: inline-block;
  background: var(--primary);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  border-radius: 2rem;
  align-self: flex-start;
}
.pillar-card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}
.pillar-card-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
```

- [ ] **Step 2: 型チェックを実行して確認**

```bash
cd C:\tool\claude\ai-diagnosis-platform\.claude\worktrees\xenodochial-colden
npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし（または Task 1 とは無関係のエラーのみ）

- [ ] **Step 3: コミット**

```bash
git add src/pages/guide/kabi-complete-guide.astro
git commit -m "feat(p5): カビ完全ガイドピラーページを追加"
```

---

## Task 2: DIY修理完全ガイドページを作成

**Files:**
- Create: `src/pages/guide/diy-repair-complete-guide.astro`

- [ ] **Step 1: ファイルを作成する**

`src/pages/guide/diy-repair-complete-guide.astro` を以下の内容で作成する：

```astro
---
import Base from "../../layouts/Base.astro";
import AdUnit from "../../components/AdUnit.astro";
import SchemaOrg from "../../components/SchemaOrg.astro";
import DiagnosisCTA from "../../components/DiagnosisCTA.astro";
import { SITE_URL } from "../../lib/site";

export const prerender = true;

const title = "DIY修理完全ガイド｜床・壁・排水口の補修方法を徹底解説";
const description = "フローリングの傷・壁紙の剥がれ・排水口のつまりなど住まいのトラブルをDIYで解決する方法を網羅。必要な道具の選び方、賃貸での注意点、業者に依頼すべき状態の判断基準まで完全解説。";
const pubDate = new Date("2026-04-06");

const summary = [
  "DIY修理を始める前に確認すべき状態チェックと材料選びの基準",
  "床・フローリングの傷を深さ別に直す補修材の選び方",
  "壁・壁紙の浮き・剥がれ・穴を賃貸でも安全に補修する方法",
  "自分でできる修理とプロへ依頼すべき損傷の見極め方",
];

const faq = [
  {
    question: "DIY修理で失敗しないコツは？",
    answer: "事前に目立たない場所で補修材のテストを行い、説明書の乾燥時間を守ることが最重要です。色合わせは自然光の下で行い、一度に厚く塗らず薄く重ね塗りすることで仕上がりが格段によくなります。",
  },
  {
    question: "賃貸の壁や床を自分で修理してもよいですか？",
    answer: "軽微な補修は可能です。ただし退去時の原状回復義務があるため、大きな加工（穴あけ・塗り替えなど）は事前に管理会社へ確認が必要です。国土交通省ガイドラインでは通常の使用による損耗は借主負担外とされています。",
  },
  {
    question: "DIY修理に最低限必要な工具は？",
    answer: "カッター・ヘラ・マスキングテープ・補修材の4点が基本セットです。フローリング補修には補修ペンやクレヨン、壁紙補修にはパテや補修シールが追加で必要になります。",
  },
  {
    question: "業者に頼む目安は？",
    answer: "同じ箇所を2回以上試みて改善しない場合、または損傷が10cm以上の広範囲に及ぶ場合は業者相談を推奨します。水漏れ・電気系統・構造上の問題は必ず業者に依頼してください。",
  },
];
---

<Base {title} {description}>
  <SchemaOrg
    slot="head"
    type="article"
    {title}
    {description}
    pubDate={pubDate}
    url={`${SITE_URL}/guide/diy-repair-complete-guide/`}
    {faq}
  />

  <article class="article-page">
    <header class="article-header">
      <h1 class="article-title">{title}</h1>
      <time class="article-date" datetime={pubDate.toISOString()}>
        公開: {pubDate.toLocaleDateString("ja-JP")}
      </time>
    </header>

    <div class="article-summary">
      <p class="article-summary-title">この記事でわかること</p>
      <ul>
        {summary.map((item) => <li>{item}</li>)}
      </ul>
    </div>

    <DiagnosisCTA diagnosisType="diy-repair" variant="top" />

    <section class="pillar-section">
      <h2>DIY修理の基本と失敗しないコツ</h2>
      <p class="pillar-section-intro">
        DIY修理を始める前に必ず行うべきことが3つあります。①損傷の範囲と深さを確認する（深さによって補修材が変わります）、②賃貸の場合は原状回復義務の範囲を確認する（国土交通省ガイドラインで通常損耗は借主負担外）、③補修材を目立たない場所でテストする。カッター・ヘラ・マスキングテープ・補修材の4点が基本工具です。一度に仕上げようとせず、薄く重ね塗りが成功の鍵です。
      </p>
    </section>

    <section class="pillar-section">
      <h2>床・フローリングの補修</h2>
      <p class="pillar-section-intro">
        フローリングの傷は深さで補修材が変わります。表面のすり傷・細かい傷には補修マーカーやクレヨンで数百円・10分で対応できます。深い傷・欠け・へこみには補修ペーストが必要で、木目への色合わせと下地処理が仕上がりの鍵です。どちらも色番号を事前に確認し、自然光の下で色合わせを行うと失敗を防げます。
      </p>
      <div class="pillar-card-grid">
        <a href="/guide/flooring-scratch/" class="pillar-card">
          <span class="pillar-card-category">DIY補修</span>
          <span class="pillar-card-title">フローリングのすり傷・浅い傷を自分で直す方法と補修材の選び方</span>
          <span class="pillar-card-desc">補修マーカー1本で10分・数百円。傷の深さ別の補修材選びと色合わせのコツ…</span>
        </a>
        <a href="/guide/floor-repair-paste/" class="pillar-card">
          <span class="pillar-card-category">DIY補修</span>
          <span class="pillar-card-title">フローリングの深い傷・欠けを補修ペーストで直す方法と選び方</span>
          <span class="pillar-card-desc">深い傷・欠け・へこみをペーストで目立たなくする手順と色合わせ・コーティング仕上げ…</span>
        </a>
      </div>
    </section>

    <section class="pillar-section">
      <h2>壁・壁紙の修理</h2>
      <p class="pillar-section-intro">
        壁の補修は損傷の種類によって方法が異なります。画鋲穴・小さな釘穴は補修シール1枚で対応可。拳大以上の穴はパテで下地を作りクロスを色合わせする必要があります。賃貸では退去前の自己補修が敷金節約に直結しますが、大きな穴は管理会社への相談を先に行うことをお勧めします。壁紙の浮き・端のめくれはボンドコークで接着し、はみ出しはすぐに濡れ布巾で拭き取ります。
      </p>
      <div class="pillar-card-grid">
        <a href="/guide/rental-wall-repair/" class="pillar-card">
          <span class="pillar-card-category">DIY補修</span>
          <span class="pillar-card-title">賃貸の壁穴・傷の補修方法と退去時の注意点</span>
          <span class="pillar-card-desc">釘穴・拳大の穴の補修材選びと国交省ガイドラインの原状回復範囲の判断基準…</span>
        </a>
        <a href="/guide/wallpaper-repair/" class="pillar-card">
          <span class="pillar-card-category">DIY補修</span>
          <span class="pillar-card-title">壁紙の補修方法まとめ【剥がれ・破れ・穴の直し方と補修材選び】</span>
          <span class="pillar-card-desc">損傷の種類別に補修シール・のり・パテの使い分けと色合わせのコツを解説…</span>
        </a>
        <a href="/guide/wallpaper-repair-seal/" class="pillar-card">
          <span class="pillar-card-category">DIY補修</span>
          <span class="pillar-card-title">壁紙補修シールの選び方と貼り方｜色合わせのコツと賃貸注意点</span>
          <span class="pillar-card-desc">白・オフホワイト・柄物の色合わせ手順と気泡が入らない貼り方…</span>
        </a>
      </div>
    </section>

    <AdUnit slot={import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_MID} />

    <section class="pillar-section">
      <h2>排水口・水回りのトラブル</h2>
      <p class="pillar-section-intro">
        排水口のつまりは場所（浴室・キッチン・洗面台）と原因（髪の毛・油・固形物）によって対処法が変わります。髪の毛は真空ポンプやワイヤーブラシで物理的に除去、油汚れは重曹＋クエン酸の発泡で分解、固形物は割り箸やピンセットで取り出します。市販のパイプクリーナー液体は月1回の予防メンテナンスに最適です。高圧洗浄が必要な重症度は業者に依頼を。
      </p>
      <div class="pillar-card-grid">
        <a href="/guide/drain-clog-removal/" class="pillar-card">
          <span class="pillar-card-category">水回りDIY</span>
          <span class="pillar-card-title">排水口のつまりを自分で解消する方法【浴室・キッチン・洗面台】</span>
          <span class="pillar-card-desc">場所と原因別の対処法、パイプクリーナーの選び方、月1回の予防メンテナンス…</span>
        </a>
      </div>
    </section>

    <section class="pillar-section">
      <h2>プロへの依頼が必要なケース</h2>
      <p class="pillar-section-intro">
        次の状況では自己修理を中断し、専門業者に相談することを強く推奨します。①同じ箇所を2回試みても改善しない、②損傷が10cm以上の広範囲に及ぶ、③水漏れや湿気が床下・壁内部に達している疑いがある、④電気配線・ガス管が関係する可能性がある。早期に業者相談することで、DIY悪化による修繕費の増大を防げます。まず写真をAI診断で状態を確認するのが手軽です。
      </p>
      <DiagnosisCTA diagnosisType="diy-repair" variant="bottom" />
    </section>

    <AdUnit slot={import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM} />

    <nav class="article-back">
      <a href="/guide/">ガイド一覧に戻る</a>
    </nav>
  </article>
</Base>

<style>
.article-summary {
  background: var(--bg-alt);
  border-left: 3px solid var(--primary);
  border-radius: 0 var(--radius) var(--radius) 0;
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
.pillar-section { margin: 2.5rem 0; }
.pillar-section-intro {
  font-size: 0.9375rem;
  line-height: 1.75;
  color: var(--text);
  margin-bottom: 1.25rem;
}
.pillar-card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
@media (max-width: 540px) {
  .pillar-card-grid { grid-template-columns: 1fr; }
}
.pillar-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.875rem 1rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  transition: border-color 0.15s;
}
.pillar-card:hover { border-color: var(--primary); }
.pillar-card-category {
  display: inline-block;
  background: var(--primary);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  border-radius: 2rem;
  align-self: flex-start;
}
.pillar-card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}
.pillar-card-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
```

- [ ] **Step 2: 型チェックを実行して確認**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/pages/guide/diy-repair-complete-guide.astro
git commit -m "feat(p5): DIY修理完全ガイドピラーページを追加"
```

---

## Task 3: guide/index.astro にピラーカードを追加

**Files:**
- Modify: `src/pages/guide/index.astro`

- [ ] **Step 1: `guide/index.astro` の `<div class="guide-grid">` を修正する**

現在の `<div class="guide-grid">` ブロック（`{articles.map(...)}` の直前）を以下に置き換える：

```astro
    <div class="guide-grid">
      <a href="/guide/kabi-complete-guide/" class="guide-card guide-card-pillar">
        <div class="guide-card-title">カビ完全ガイド</div>
        <div class="guide-card-desc">浴室・押入れ・壁のカビの原因・除去・予防を完全網羅。洗剤の使い分けから業者依頼の判断基準まで。</div>
      </a>
      <a href="/guide/diy-repair-complete-guide/" class="guide-card guide-card-pillar">
        <div class="guide-card-title">DIY修理完全ガイド</div>
        <div class="guide-card-desc">床・壁・排水口のトラブルをDIYで解決する方法を網羅。賃貸での注意点と業者依頼の目安も解説。</div>
      </a>
      {articles.map((article) => (
        <a href={`/guide/${article.id}/`} class="guide-card">
          <div class="guide-card-title">{article.data.title}</div>
          <div class="guide-card-desc">{article.data.description}</div>
          <time class="guide-card-date" datetime={article.data.pubDate.toISOString()}>
            {article.data.pubDate.toLocaleDateString("ja-JP")}
          </time>
        </a>
      ))}
    </div>
```

- [ ] **Step 2: `<style>` ブロックに `.guide-card-pillar` を追加する**

既存の `.guide-card:hover` ルールの直後に追記する：

```css
.guide-card-pillar {
  border-color: var(--primary);
}
.guide-card-pillar .guide-card-title {
  color: var(--primary);
}
```

- [ ] **Step 3: 型チェックを実行して確認**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/pages/guide/index.astro
git commit -m "feat(p5): /guide/ インデックスにピラーページカードを追加"
```

---

## Task 4: 最終検証

**Files:** 変更なし（確認のみ）

- [ ] **Step 1: テストを実行する**

```bash
npm test
```

Expected: 全件 PASS（ピラーページは静的ページのためテスト対象外だが、既存テストが壊れていないことを確認）

- [ ] **Step 2: ビルドを実行する**

```bash
npm run build 2>&1 | tail -20
```

Expected:
```
▶ Completed in X.XXs
```
エラーなし。`dist/` に `guide/kabi-complete-guide/index.html` と `guide/diy-repair-complete-guide/index.html` が生成されていること。

- [ ] **Step 3: 生成ファイルを確認する**

```bash
ls dist/guide/kabi-complete-guide/
ls dist/guide/diy-repair-complete-guide/
```

Expected: 各ディレクトリに `index.html` が存在する。

- [ ] **Step 4: カードリンクの正確性を確認する**

```bash
grep -o 'href="/guide/[^"]*"' dist/guide/kabi-complete-guide/index.html
grep -o 'href="/guide/[^"]*"' dist/guide/diy-repair-complete-guide/index.html
```

Expected（kabi）:
```
href="/guide/black-mold-removal/"
href="/guide/mold-prevention-spray/"
href="/guide/"
```

Expected（diy-repair）:
```
href="/guide/flooring-scratch/"
href="/guide/floor-repair-paste/"
href="/guide/rental-wall-repair/"
href="/guide/wallpaper-repair/"
href="/guide/wallpaper-repair-seal/"
href="/guide/drain-clog-removal/"
href="/guide/"
```

- [ ] **Step 5: /guide/ インデックスにピラーカードが先頭に存在することを確認する**

```bash
grep -c 'guide-card-pillar' dist/guide/index.html
```

Expected: `2`

- [ ] **Step 6: 最終コミット（未コミットの変更がある場合）**

```bash
git status
# 未コミットファイルがあれば:
git add -p
git commit -m "chore(p5): ピラーページ実装完了"
```

---

## 完了条件チェックリスト

- [ ] `npx tsc --noEmit` エラーなし
- [ ] `npm test` 全件パス
- [ ] `npm run build` 成功
- [ ] `/guide/kabi-complete-guide/` ページが生成される
- [ ] `/guide/diy-repair-complete-guide/` ページが生成される
- [ ] 各ピラーページの記事カードリンクが正しいURLを指している
- [ ] `/guide/` の先頭に2枚のピラーカード（`guide-card-pillar`）が表示される
- [ ] Schema.org Article + FAQPage が各ページの `<head>` に出力される
