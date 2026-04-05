# P3: 既存12記事 SEO最適化設計書

**作成日**: 2026-04-05
**対象**: `src/content/guide/*.mdx` 全12記事
**アプローチ**: テンプレート駆動（Approach A）

---

## 目的

1. **title/description最適化** — Googleの表示枠（description: 120〜160文字）に合わせ、検索意図キーワード・具体的数値・ユーザー便益を含む文章に更新
2. **article-summary追加** — 記事冒頭に「この記事でわかること」ボックスを配置し、直帰率改善と滞在時間向上を図る
3. **内部リンク強化** — 同グループ記事への「関連記事」セクションを自動生成し、回遊率とクロールカバレッジを向上させる

---

## スキーマ変更 (`src/content.config.ts`)

```ts
const guide = defineCollection({
  schema: z.object({
    // ... 既存フィールド ...
    summary: z.array(z.string()).optional(),   // この記事でわかること（3〜5件）
    relatedGroup: z.string().optional(),        // 内部リンクグループ名
  }),
});
```

### relatedGroup 値一覧

| グループ名 | 対象記事 |
|-----------|---------|
| `kabi` | black-mold-removal, mold-prevention-spray, drain-clog-removal |
| `diy-repair` | floor-repair-paste, flooring-scratch, rental-wall-repair, wallpaper-repair, wallpaper-repair-seal |
| `car-care` | car-scratch-repair, headlight-polish, tire-check-timing, winter-tire-timing |

---

## テンプレート変更 (`src/pages/guide/[slug].astro`)

### 1. summaryボックス（article-header 直後）

```astro
{entry.data.summary && (
  <div class="article-summary">
    <p class="article-summary-title">📋 この記事でわかること</p>
    <ul>
      {entry.data.summary.map(item => <li>{item}</li>)}
    </ul>
  </div>
)}
```

**スタイル**: `--bg-alt` 背景、`--primary` 左ボーダー、箇条書きにチェックマーク

### 2. 関連記事セクション（`<nav class="article-back">` 直前）

```astro
// getStaticPaths の外で getCollection 済みの articles を利用
const related = entry.data.relatedGroup
  ? allArticles
      .filter(a => a.data.relatedGroup === entry.data.relatedGroup && a.id !== entry.id)
      .slice(0, 3)
  : [];
```

```astro
{related.length > 0 && (
  <section class="related-articles">
    <h2>関連記事</h2>
    <ul>
      {related.map(a => (
        <li>
          <a href={`/guide/${a.id}/`}>
            <span class="related-category">{a.data.category}</span>
            {a.data.title}
          </a>
        </li>
      ))}
    </ul>
  </section>
)}
```

**スタイル**: カード風リスト、カテゴリバッジ（`--primary` 背景）

---

## Frontmatter更新仕様（全12記事）

### title 方針
- 現行タイトルを尊重しつつ、検索ボリュームの高いキーワードを追加
- 変更が有効な記事のみ修正（不要なリライトはしない）

### description 方針
- 120〜160文字に拡張
- 含める要素: ①具体的数値・基準値 ②対象ユーザー ③得られる結果

### summary 方針（各記事3〜5件）
- 記事の主要セクションを反映した箇条書き
- 「〜の方法」「〜の選び方」「〜のコツ」など名詞止め

---

### 記事別 Frontmatter 更新内容

#### black-mold-removal
```yaml
title: "黒カビの落とし方と最強洗剤の選び方【浴室・押入れ・壁】"  # 現行維持
description: "黒カビ（クロカビ）の効果的な除去方法を、浴室・押入れ・壁クロス別に詳しく解説。塩素系・アルコール系・重曹の使い分け基準から、作業時の安全注意事項、再発を防ぐ防カビスプレーの使い方まで完全網羅します。"
relatedGroup: "kabi"
summary:
  - "塩素系・アルコール系・重曹の3種類の使い分け基準"
  - "浴室・押入れ・壁クロス別の除去手順"
  - "作業時の安全注意事項（混合厳禁・換気・保護具）"
  - "再発を防ぐ防カビスプレーと換気ルーティン"
```

#### mold-prevention-spray
```yaml
title: "カビ防止スプレーの選び方と効果的な使い方【場所別・2026年版】"
description: "浴室・押入れ・エアコン・靴箱など場所別にカビ防止スプレーのおすすめ商品を比較。防カビ効果が続く塗布タイミング、下地処理の有無、スプレーと防カビシートの使い分けポイントを解説します。"
relatedGroup: "kabi"
summary:
  - "場所別（浴室・押入れ・靴箱）のおすすめスプレー選定基準"
  - "防カビ効果を最大化する塗布タイミングと下地処理"
  - "スプレーと防カビシートの使い分け方法"
```

#### drain-clog-removal
```yaml
title: "排水口のつまりを自分で解消する方法【浴室・キッチン・洗面台】"  # 現行維持
description: "排水口のつまりを自分で解消する方法を、浴室・キッチン・洗面台の場所別に解説。髪の毛・油汚れ・固形物など原因別の対処法、パイプクリーナーの選び方と使用手順、つまりを予防する定期メンテナンスの方法もまとめています。"
relatedGroup: "kabi"
summary:
  - "浴室・キッチン・洗面台別のつまり原因と対処法"
  - "パイプクリーナー（液体・錠剤）の選び方と使用手順"
  - "高圧洗浄が必要な重症度の見極め方"
  - "月1回でできるつまり予防メンテナンス"
```

#### floor-repair-paste
```yaml
title: "フローリング補修ペーストの使い方と失敗しない選び方"  # 現行維持
description: "フローリングの深い傷・欠け・へこみを補修ペーストで直す方法を解説。木目の色合わせ方法、下地処理の手順、補修後の仕上げまで失敗しないポイントを説明します。賃貸退去時の補修にも対応した商品選びのコツもご紹介。"
relatedGroup: "diy-repair"
summary:
  - "補修ペーストと補修マーカーの使い分け基準（傷の深さ別）"
  - "木目の色合わせと下地処理の手順"
  - "仕上げ（コーティング剤・ニス）の選び方"
  - "賃貸退去時に使える補修グッズの選定ポイント"
```

#### flooring-scratch
```yaml
title: "フローリングの傷を自分で直す方法と補修材の選び方"  # 現行維持
description: "フローリングの細かいすり傷・浅い傷は補修マーカーや補修クレヨンで自分で直せます。傷の深さ別に補修マーカー・クレヨン・補修ペーストを使い分ける基準と、色を合わせるコツ、失敗しない下地処理の手順を解説します。"
relatedGroup: "diy-repair"
summary:
  - "傷の深さ別：補修マーカー・クレヨン・ペーストの選び方"
  - "色合わせのコツとテスト貼り手順"
  - "DIY補修に適した傷と業者依頼すべき傷の見極め方"
```

#### rental-wall-repair
```yaml
title: "賃貸の壁穴・傷の補修方法と退去時の注意点"  # 現行維持
description: "賃貸退去前に自分で壁穴・傷を補修する方法を解説。釘穴・画鋲穴・拳大の穴それぞれに使うパテや補修シールの選び方、クロスとの色合わせ、大家・管理会社への説明ポイント、敷金を守るために知っておきたい国土交通省ガイドラインも紹介します。"
relatedGroup: "diy-repair"
summary:
  - "穴の大きさ別（釘穴・画鋲穴・拳大）の補修材選定"
  - "パテ埋め→やすり→クロス色合わせの手順"
  - "自然損耗と入居者負担の境界線（国交省ガイドライン）"
  - "退去前に自分で補修すべき箇所の優先度判断"
```

#### wallpaper-repair
```yaml
title: "壁紙の補修方法まとめ【剥がれ・破れ・穴の直し方】"  # 現行維持
description: "壁紙の破れ・剥がれ・穴を自分で補修する方法を、損傷の種類別に解説します。補修シール・のり・パテそれぞれの使い分け方、既存クロスとの色・柄合わせのコツ、賃貸でも使える跡が残りにくい補修材の選び方もまとめています。"
relatedGroup: "diy-repair"
summary:
  - "剥がれ・破れ・穴それぞれに適した補修材の選び方"
  - "既存クロスとの色・柄合わせと継ぎ目処理のコツ"
  - "賃貸でも使える跡が残りにくい補修シールの使い方"
```

#### wallpaper-repair-seal
```yaml
title: "壁紙補修シールの選び方と貼り方｜色合わせのコツ"  # 現行維持
description: "壁紙補修シールの色・柄の選び方、きれいに貼るコツ、目立たない補修方法を詳しく解説。白・オフホワイト・木目調など色合わせの手順、気泡が入らない貼り方、賃貸退去時に使う際の注意点と原状回復範囲の判断基準もまとめています。"
relatedGroup: "diy-repair"
summary:
  - "白・オフホワイト・柄物それぞれの色合わせ手順"
  - "気泡が入らないシールの貼り方と縁処理"
  - "賃貸退去時の原状回復範囲の判断基準"
```

#### car-scratch-repair
```yaml
title: "車の小傷を自分で直すDIY補修グッズとやり方【2026年版】"
description: "車ボディの小傷・すり傷をDIYで補修する方法を解説。コンパウンド・タッチアップペン・補修シートの使い分け、深さ別の対処手順、塗装を傷めないコンパウンドの選び方と磨き方のコツ。自力補修の限界と業者依頼の判断基準も説明します。"
relatedGroup: "car-care"
summary:
  - "傷の深さ別（クリア層・塗装層・素地露出）の補修方法"
  - "コンパウンド・タッチアップペン・補修シートの使い分け"
  - "色番号の調べ方と塗料の合わせ方"
  - "自力補修の限界と板金業者に依頼する判断基準"
```

#### headlight-polish
```yaml
title: "ヘッドライトの黄ばみを自分で磨く方法と磨き剤の選び方"  # 現行維持
description: "ヘッドライトの黄ばみ・白濁の原因（UV劣化・酸化）と、コンパウンド・研磨剤・コーティング剤を使ったDIY磨き手順を解説。耐水ペーパー（#1000〜#3000）の使い方、磨き後のコーティングで黄ばみ再発を防ぐ方法、1〜2年で黄ばみが戻る原因と対策もまとめています。"
relatedGroup: "car-care"
summary:
  - "黄ばみ・白濁の原因（UV劣化・酸化）と程度の見極め"
  - "耐水ペーパー→コンパウンド→コーティングの正しい手順"
  - "磨き後のコーティングで再発防止する方法"
  - "DIYで対応できる黄ばみとプロ依頼が必要な状態の判断"
```

#### tire-check-timing
```yaml
title: "タイヤ点検の時期とチェックポイント【溝・空気圧・ひび割れ】"  # 現行維持
description: "タイヤの安全基準となる溝の深さ（法定限界1.6mm、実用限界4mm）の確認方法と、空気圧・ひび割れのセルフチェック手順を解説。タイヤの寿命目安（走行距離・製造年）、ガソリンスタンドと自宅での点検方法の違い、交換時期の判断基準もまとめています。"
relatedGroup: "car-care"
summary:
  - "溝の深さの法定限界（1.6mm）と実用交換目安（4mm）"
  - "空気圧・ひび割れのセルフチェック手順"
  - "タイヤの寿命目安（走行距離・製造年からの計算方法）"
  - "スタンドと自宅での点検方法の違い"
```

#### winter-tire-timing
```yaml
title: "冬タイヤへの交換時期はいつ？地域別・気温別の目安"  # 現行維持
description: "スタッドレスタイヤへの交換時期を、北海道・東北・関東甲信・西日本など地域別・気温別に解説。「気温7℃以下」を目安にした判断基準、交換を早めるべき天気予報の見方、スタッドレスタイヤの保管方法とグリップ性能の寿命（3〜4シーズン）もまとめています。"
relatedGroup: "car-care"
summary:
  - "地域別（北海道・東北・関東・西日本）の交換時期目安"
  - "「気温7℃以下」を基準にした判断フロー"
  - "スタッドレスタイヤのグリップ寿命（3〜4シーズン）の見極め"
  - "オフシーズンの保管方法と劣化防止のコツ"
```

---

## 実装ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/content.config.ts` | `summary`・`relatedGroup` フィールド追加 |
| `src/pages/guide/[slug].astro` | summaryボックス・関連記事セクション追加 |
| `src/content/guide/*.mdx` × 12 | title・description・summary・relatedGroup 更新 |

---

## 完了条件

- [ ] `npx tsc --noEmit` エラーなし
- [ ] `npm test` 全件パス
- [ ] 全12記事でsummaryボックスが表示される
- [ ] 同グループ内の関連記事リンクが正しく表示される（自記事が含まれないこと）
- [ ] descriptionがすべて120文字以上
