# AI画像診断プラットフォーム — Claude Code 引継ぎ資料（Approach A 適用版）

> **作成日**: 2026-03-30（Approach A：シンプルCloudflare構成に変更）
> **目的**: 収益化するAI画像診断Webアプリの設計・実装・運用を完全に引き継ぐ
> **重要**: このファイルを `CLAUDE.md` としてプロジェクトルートに配置すること

---

## 変更サマリー（旧HANDOFF.mdからの差分）

| 項目 | 旧プラン | **このプラン（Approach A）** |
|------|---------|--------------------------|
| 構成 | pnpm workspaces モノレポ | **単一Astroプロジェクト** |
| バックエンド | 別プロジェクトの Cloudflare Workers | **Cloudflare Pages Functions**（同一repo） |
| アプリ設定 | Cloudflare KV | **静的 JSON import**（スケール時にKV移行） |
| AIモデル | auto（2段階ルーティング） | **Haiku固定**（全アプリ。精度不足時にSonnetへ切替） |
| OGP画像 | Satori 動的生成 | **静的 og.png**（アプリごとに1枚） |
| コスト（月10,000診断） | ~$40〜55 | **~$10〜15** |

---

## 0. プロジェクトの本質

**作るのはアプリではなく収益システム。**

- ユーザーが画像を撮影 → Claude APIで診断 → 購買意図が最高の状態でアフィリエイトリンクを提示
- アプリを量産するのではなく、**設定JSONを追加するだけで新題材が増える共通基盤**を作る
- SEO記事（`/guide/`）が流入エンジン、診断ツール（`/`）が収益エンジン、両者は同一ドメイン

---

## 1. ドメイン・サイト構成

### 同一ドメイン構成（必須）

```
https://example.com/
│
├── /                          # トップ：アプリ一覧
├── /[appId]/                  # 各診断アプリ
│   └── result/[uuid]          # 診断結果（SNSシェア用）
│
├── /guide/                    # SEO記事ハブ ← アフィリエイト審査対象
│   ├── /guide/wallpaper-repair/
│   ├── /guide/floor-scratch/
│   └── ... (最低10記事)
│
├── /privacy/                  # プライバシーポリシー（審査必須）
├── /terms/                    # 利用規約（審査必須）
├── /contact/                  # お問い合わせ（審査必須）
└── /about/                    # 運営者情報（審査必須）
```

### なぜ同一ドメインか

| 観点 | 同一ドメイン | 別ドメイン |
|------|------------|---------|
| 管理コスト | 低（1つのリポジトリ） | 高（2つ管理） |
| SEO効果 | ドメイン全体に蓄積 | 分散 |
| 審査申請URL | `/guide/` を指定すれば審査通過しやすい | ブログを別途管理 |
| アフィリエイトリンク | 診断結果にも記事にも設置できる | 診断サイトは審査落ちリスク |

### アフィリエイト審査での申請URL

```
申請URL: https://example.com/guide/
（診断ツールのURLではなくコンテンツ記事のURLを登録する）
```

---

## 2. 技術スタック（Approach A確定版）

| レイヤー | 技術 | 備考 |
|---------|------|------|
| フレームワーク | **Astro** (`output: "server"`) | SSR + SSG混在、SEOに最適 |
| ホスティング | **Cloudflare Pages** | 無料・高速・グローバルCDN |
| バックエンド | **Cloudflare Pages Functions** | Astro APIルートが自動的にWorkers化される |
| AI | **Claude API** `claude-haiku-4-5` | Haiku固定。月10,000診断で~$10〜15 |
| アプリ設定 | **静的 JSON import** (`src/configs/`) | KVは後で必要になったら追加 |
| 画像処理 | クライアント側リサイズ + base64 | 長辺800px、JPEG 0.85品質 |
| OGP画像 | **静的 og.png**（アプリごと） | Satori不要 |
| パッケージ管理 | **npm**（シングルプロジェクト） | pnpm workspaces 不要 |
| 記事フォーマット | **MDX** | Astro Content Collections |
| Cloudflare adapter | **@astrojs/cloudflare** | Pages Functions統合 |

### なぜPages Functions（Workers分離廃止）か

- Astroの `src/pages/api/` に `.ts` ファイルを置くだけで自動的にWorkers関数になる
- `workers/` ディレクトリ・`wrangler.toml`・モノレポが不要
- デプロイは `wrangler pages deploy` または GitHub連携1コマンドで完結
- シークレット（APIキー）はCloudflare Pagesのダッシュボードから設定

---

## 3. リポジトリ構造（シングルプロジェクト版）

```
ai-diagnosis-platform/
│
├── CLAUDE.md                       ← このファイル
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── .env.example
│
└── src/
    ├── layouts/
    │   └── Base.astro              # 全ページ共通レイアウト（アフィリエイト表示含む）
    │
    ├── pages/
    │   ├── index.astro             # トップ（アプリ一覧）
    │   │
    │   ├── [appId]/
    │   │   ├── index.astro         # 診断UI
    │   │   └── result/
    │   │       └── [uuid].astro    # 診断結果シェアページ
    │   │
    │   ├── api/
    │   │   └── [appId]/
    │   │       └── analyze.ts      # ← Pages Function（Workers runtime）
    │   │
    │   ├── guide/
    │   │   ├── index.astro         # 記事一覧（審査申請URL）
    │   │   └── [slug].astro        # 個別記事（MDX）
    │   │
    │   ├── privacy.astro
    │   ├── terms.astro
    │   ├── contact.astro
    │   └── about.astro
    │
    ├── components/
    │   ├── ImageUploader.tsx       # 画像アップロードUI（クライアント側リサイズ込み）
    │   ├── DiagnosisResult.tsx     # 診断結果表示
    │   ├── AffiliateBlock.tsx      # アフィリエイトリンク
    │   └── AdUnit.astro            # AdSense広告ユニット
    │
    ├── configs/
    │   ├── index.ts                # 全設定をまとめてexport
    │   ├── diy-repair.json
    │   ├── kabi-diagnosis.json
    │   ├── gomi-bunbetsu.json
    │   └── affiliate-programs.json # ASP管理台帳
    │
    └── content/
        └── guide/                  # MDX記事ファイル群
            ├── wallpaper-repair.mdx
            └── ...（10記事以上）
```

---

## 4. 実装：Pages Function（コア）

### 4-1. astro.config.mjs

```javascript
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [react(), mdx()],
});
```

### 4-2. src/pages/api/[appId]/analyze.ts（Pages Function）

```typescript
import type { APIRoute } from "astro";
import { getConfig } from "../../../configs/index";
import { callClaude } from "../../../lib/claude";
import { applyMonetization } from "../../../lib/monetization";
import { isRateLimited } from "../../../lib/rate-limit";

export const POST: APIRoute = async ({ params, request, locals }) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const appId = params.appId!;

  // ① 静的JSON設定を取得（KV不要）
  const config = getConfig(appId);
  if (!config) {
    return Response.json({ error: "App not found" }, { status: 404 });
  }

  // ② シークレットはCloudflare Pages環境変数から取得
  const env = (locals.runtime as { env: Record<string, string> }).env;
  const apiKey = env.ANTHROPIC_API_KEY;

  // ③ レートリミット（IP別・日次）
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (await isRateLimited(ip, config.daily_limit ?? 5)) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // ④ 画像受け取り（base64 → Claude送信 → 即破棄。保存しない）
  const { image, context } = await request.json() as {
    image: string;
    context: Record<string, string>;
  };

  // ⑤ プロンプトのテンプレート変数を置換
  const prompt = config.prompt.replace(
    /\{\{(\w+)\}\}/g,
    (_: string, key: string) => context[key] ?? ""
  );

  // ⑥ Claude API呼び出し（Haiku固定 + Prompt Caching）
  const result = await callClaude(apiKey, image, prompt);

  // ⑦ 収益ロジック適用
  const enriched = applyMonetization(result, config.monetization, context, {
    amazonId: env.AMAZON_ASSOCIATE_ID,
    rakutenId: env.RAKUTEN_AFFILIATE_ID,
  });

  return Response.json(enriched, { headers: corsHeaders });
};

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
```

### 4-3. src/lib/claude.ts（Haiku固定 + Prompt Caching）

```typescript
// モデルはHaiku固定。精度不足が実測で判明した場合のみSonnetに切り替える。
// auto（2段階ルーティング）は廃止。理由：Haikuで難易度判定1回 + 診断1回 = 2倍コストになるケースが多い。

const MODEL = "claude-haiku-4-5";

export async function callClaude(
  apiKey: string,
  imageBase64: string,
  prompt: string,
  maxRetries = 3
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        // Prompt Caching: システムプロンプトをキャッシュ（ヒット時0.1倍コスト）
        system: [
          {
            type: "text",
            text: prompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64,
                },
              },
              { type: "text", text: "上記の画像を診断してください。" },
            ],
          },
        ],
      }),
    });

    // 529 = API過負荷。指数バックオフでリトライ
    if (response.status === 529) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content.find((b) => b.type === "text")?.text ?? "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  }
  throw new Error("Claude API unavailable after retries");
}
```

> **Haikuで精度が不足する場合**: `const MODEL` を `"claude-sonnet-4-6"` に変更するだけ。
> アプリごとに切り替えたい場合は `config.model` フィールドを追加して渡す。

### 4-4. src/lib/monetization.ts

```typescript
type Rule = {
  condition: string;   // "category === '粗大ゴミ'" | "default"
  type: "affiliate" | "cpa" | "adsense";
  keyword?: string;
  cpa_url?: string;
};

export function applyMonetization(
  result: Record<string, unknown>,
  rules: Rule[],
  context: Record<string, string>,
  ids: { amazonId: string; rakutenId: string }
): Record<string, unknown> {
  const rule = rules.find((r) => {
    if (r.condition === "default") return true;
    const [field, , value] = r.condition.split(" ");
    return String(result[field] ?? "") === value.replace(/'/g, "");
  });

  if (!rule) return result;

  const keyword = (rule.keyword ?? "").replace(
    /\{\{(\w+)\}\}/g,
    (_: string, k: string) => String(result[k] ?? context[k] ?? "")
  );

  return {
    ...result,
    monetization: {
      type: rule.type,
      amazon_url:
        rule.type === "affiliate"
          ? `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${ids.amazonId}`
          : null,
      rakuten_url:
        rule.type === "affiliate"
          ? `https://hb.afl.rakuten.co.jp/hgc/${ids.rakutenId}/?pc=https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`
          : null,
      cpa_url: rule.cpa_url ?? null,
    },
  };
}
```

### 4-5. src/lib/rate-limit.ts

> **Approach A**: KVなし。インメモリMap（同一Workerインスタンス内）で簡易レートリミット。
> スケール時（複数インスタンス）はCloudflare KVに差し替えることを検討。

```typescript
const counts = new Map<string, { count: number; date: string }>();

export async function isRateLimited(ip: string, limit: number): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;
  const entry = counts.get(key);

  if (!entry || entry.date !== today) {
    counts.set(key, { count: 1, date: today });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}
```

---

## 5. アプリ設定（静的JSON import）

### 設計思想

KVを使わず静的importにする。新アプリ追加は`src/configs/`にJSONを追加して`index.ts`に1行加えるだけ。
デプロイが必要だが、初期の2〜3本では運用コストは無視できる。
**10本を超えたらKV移行を検討する。**

### src/configs/index.ts

```typescript
import diyRepair from "./diy-repair.json";
import kabiDiagnosis from "./kabi-diagnosis.json";
import gomiBunbetsu from "./gomi-bunbetsu.json";

const configs: Record<string, unknown> = {
  "diy-repair": diyRepair,
  "kabi-diagnosis": kabiDiagnosis,
  "gomi-bunbetsu": gomiBunbetsu,
};

export function getConfig(appId: string) {
  return configs[appId] ?? null;
}
```

### src/configs/diy-repair.json

```json
{
  "name": "DIY補修診断",
  "daily_limit": 5,
  "prompt": "あなたはDIY補修の専門家です。画像を解析し、以下のJSONのみを返してください（説明文不要）:\n{\n  \"damage_type\": \"壁紙破れ|木材傷|床傷|カビ|その他\",\n  \"damage_level\": \"軽微|中程度|重度\",\n  \"color_description\": \"色の説明\",\n  \"products\": [\n    {\n      \"category\": \"商品カテゴリ名\",\n      \"amazon_keyword\": \"Amazon検索キーワード\",\n      \"reason\": \"推奨理由（1文）\",\n      \"priority\": 1\n    }\n  ],\n  \"diy_tip\": \"補修のコツ（1〜2文）\"\n}",
  "monetization": [
    { "condition": "default", "type": "affiliate", "keyword": "{{products[0].amazon_keyword}}" }
  ],
  "seo": {
    "title": "DIY補修材を診断 | AI補修診断",
    "keywords": ["壁紙 補修 DIY", "フローリング 傷 補修", "賃貸 壁 穴 補修"]
  }
}
```

### src/configs/gomi-bunbetsu.json（条件分岐収益の例）

```json
{
  "name": "これは何ゴミ？",
  "daily_limit": 10,
  "prompt": "ゴミを判定しJSONのみ返してください。自治体：{{municipality}}\n{\n  \"item_name\": \"品目名\",\n  \"category\": \"燃えるゴミ|燃えないゴミ|資源ゴミ|粗大ゴミ|特別回収\",\n  \"municipality_note\": \"注意事項\",\n  \"confidence\": \"high|medium|low\"\n}",
  "monetization": [
    { "condition": "category === '粗大ゴミ'", "type": "cpa", "cpa_url": "https://example-kaitori.jp/?utm_source=gomi-app" },
    { "condition": "default", "type": "adsense" }
  ]
}
```

### 全15題材の実装優先順序（変更なし）

```
Month 1: diy-repair + kabi-diagnosis    （構造同一・即量産）
Month 2: tire-check                     （季節性高・CPA単価良）
Month 3: exterior-diagnosis             （最高単価・SEO早期種まき）
Month 6: pet-skin + vintage-fashion     （長期安定流入）
```

---

## 6. アフィリエイト審査：準備から承認まで

### 6-1. 審査が通らない診断サイト単体の問題点

| 審査基準 | 診断サイト単体 | `/guide/` 併設後 |
|---------|-------------|---------------|
| 最低10記事 | ✗（ツールページのみ） | ✓ |
| オリジナルコンテンツ | △（UIはあるが文章薄い） | ✓ |
| 60日以内の更新 | △（機能更新のみ） | ✓ |
| 審査官の期待 | 「Webアプリ」 | 「コンテンツサイト」 |

**→ Amazon審査申請URLは `https://example.com/guide/` を指定する**

### 6-2. Claude Code で審査準備を一括完了

#### Step A：必須ページの生成

```bash
claude "以下の4ページをAstroコンポーネントとして生成してください。
すべて日本語・SEOメタタグ付き・レスポンシブ対応。

1. src/pages/privacy.astro
   内容:
   - Amazonアソシエイト・プログラム参加の明記
   - 楽天アフィリエイト・A8.net参加の明記
   - Google AdSenseのCookieと広告配信の説明
   - アクセス解析ツール（Cloudflare Analytics）の使用説明
   - お問い合わせ先（メール: [your-email]）
   - 制定日: 2026年XX月XX日

2. src/pages/terms.astro
   内容:
   - AI診断は参考情報であり医療・法的・専門的判断ではない旨
   - 画像は診断目的のみに使用し保存しない旨（即時破棄）
   - 診断結果の正確性を保証しない旨
   - 外部リンク（Amazon等）への免責

3. src/pages/contact.astro
   内容: シンプルな連絡先ページ（メールアドレスのみ、フォームなし）

4. src/pages/about.astro
   内容: 運営者情報（個人運営・所在地都道府県レベル・設立年）

また、src/layouts/Base.astro のフッターに
以下を全ページ自動表示してください：
'本サイトはAmazonアソシエイト・楽天アフィリエイト等の
アフィリエイトプログラムに参加しています。
記事内のリンクから商品を購入いただいた場合、
報酬が発生することがあります。'"
```

#### Step B：SEO記事10本の一括生成

```bash
claude "以下の10記事をAstroのMDXコレクション形式で生成してください。
出力先: src/content/guide/

各記事の要件:
- フロントマター: title, description, pubDate, category, tags
- 本文: 骨格として1,000字以上のAI生成文（後で手直しする前提でOK）
- 見出し: H2×3以上
- 内部リンク: 診断ツールへの誘導を各記事末尾に1箇所
- Amazonリンク: [AMAZON_LINK: {検索キーワード}] というプレースホルダーを各記事2〜3箇所

記事一覧:
1. slug: wallpaper-repair
   title: 壁紙の破れ・剥がれ補修の方法とおすすめ商品【賃貸でも安心】
2. slug: flooring-scratch
   title: フローリングの傷を自分で直す方法と補修マーカーの選び方
3. slug: black-mold-removal
   title: 黒カビの落とし方と最強洗剤の選び方【浴室・押入れ・壁】
4. slug: tire-check-timing
   title: タイヤの溝チェック方法と交換時期の正しい判断基準
5. slug: winter-tire-timing
   title: 冬タイヤへの交換時期はいつ？地域別・気温別の目安
6. slug: floor-repair-paste
   title: フローリング補修ペーストの使い方と失敗しない選び方
7. slug: rental-wall-repair
   title: 賃貸退去前の壁穴補修｜敷金を守るDIY手順と注意点
8. slug: mold-prevention-spray
   title: カビ防止スプレーのおすすめ比較【浴室・押入れ・クローゼット】
9. slug: car-scratch-repair
   title: 車の小傷を自分で直すDIY補修グッズとやり方
10. slug: wallpaper-repair-seal
    title: 壁紙補修シールの選び方と貼り方｜色合わせのコツ"
```

#### Step C：Amazonリンクのプレースホルダーを実リンクに置換

```bash
claude "src/content/guide/ 内の全MDXファイルにある
[AMAZON_LINK: {キーワード}] というプレースホルダーを
実際のAmazonアソシエイトリンク形式に置換してください。

形式: https://www.amazon.co.jp/s?k=ENCODED_KEYWORD&tag=ASSOCIATE_ID

暫定として、アソシエイトID部分は環境変数
PUBLIC_AMAZON_ASSOCIATE_ID から読み込むAstroコンポーネント
src/components/AmazonLink.astro を作成し、
MDX内では <AmazonLink keyword='補修マーカー'>補修マーカーを見る</AmazonLink>
の形式に変換してください"
```

#### Step D：AdSenseコードの埋め込み

```bash
claude "Googleアドセンス審査用のコードを全ページに埋め込んでください。

- 挿入先: src/layouts/Base.astro の <head> 内
- 条件: 環境変数 PUBLIC_ADSENSE_CLIENT_ID が設定されている場合のみ
- 審査通過後に広告ユニットを表示する
  src/components/AdUnit.astro も作成
  (レスポンシブ広告・記事ページのみ表示)

.env.example に以下を追加してください:
PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
PUBLIC_AMAZON_ASSOCIATE_ID=yoursite-22
RAKUTEN_AFFILIATE_ID=xxxxxxxx.xxxxxxxx"
```

### 6-3. ASP対応状況と作業手順

> ⚠️ **前提条件の変更（2026-03-30確認）**
> A8.net・もしもアフィリエイト・楽天アフィリエイト・ValueCommerce・アクセストレードは
> **別Webアプリで既に会員登録済み・利用中**。
> このWebアプリに対して必要な作業は「新規登録」ではなく「**既存アカウントへのサイト（メディア）追加**」。

#### 作業順序

```
Day 1 午前: Cloudflare Pagesにデプロイ（公開状態にする）
            ↓ サイトが公開状態でないと各ASPのサイト審査が通らない

Day 1 午後: 既登録5ASPにこのサイトを追加登録
            A8.net / もしもアフィリエイト / 楽天 / ValueCommerce / アクセストレード

Day 2:      Amazonアソシエイト本家を新規申請（180日カウント開始）
            ※ もしもアフィリエイト経由でAmazon提携も同時申請（保険）

Day 3〜:    Googleアドセンスを新規申請
Month 2〜:  各ASPで高単価CPA案件に個別提携申請
```

---

#### ① A8.net ―― 既存アカウントにサイト追加

```
ログイン先: https://www.a8.net
作業: メディア管理 → 「サイトを追加する」

追加情報:
  URL:      https://example.com/guide/
  カテゴリ: ライフスタイル / DIY・住まい
  説明文:   200字以内（Claude in Chromeで生成）

注意: XへのA8リンク掲載は規約で禁止（本家Amazonリンクは可）
```

サイト追加後すぐに提携申請する案件:
```
□ タイヤ交換・カー用品系（tire-check アプリ用）
□ 不用品回収・買取系（gomi-bunbetsu アプリ用）
□ リフォーム見積（タウンライフリフォーム推奨・exterior-diagnosis用）
□ ペット用品系（pet-skin アプリ用）
```

---

#### ② もしもアフィリエイト ―― 既存アカウントにサイト追加

```
ログイン先: https://af.moshimo.com
作業: メディア管理 → 「新しいメディアを登録」

追加情報:
  URL:  https://example.com/guide/
  説明: A8.netと同じ説明文を流用可

W報酬制度: 成果に応じてもしもから追加ボーナスが付く（実質報酬率アップ）
```

サイト追加後すぐに:
```
□ Amazonアソシエイトへの提携申請
  （本家より審査が通りやすいケースあり・Amazon本家申請の保険として使う）
□ 承認されたAmazon提携のIDを src/configs/affiliate-programs.json に記録
```

---

#### ③ 楽天アフィリエイト ―― 既存アカウントにサイト追加

```
ログイン先: https://affiliate.rakuten.co.jp
作業: メディア登録 → 「サイト・ブログを追加」

追加情報:
  URL: https://example.com/guide/

メリット: Cookie有効期間が30日（Amazonの24時間より大幅に有利）
報酬率: 1〜3%

完了後: 楽天リンクシェアでキーワード検索URLを生成し
        Cloudflare PagesのシークレットにRAKUTEN_AFFILIATE_IDを設定
```

---

#### ④ ValueCommerce ―― 既存アカウントにサイト追加

```
ログイン先: https://www.valuecommerce.ne.jp
作業: サイト管理 → 「サイトを追加する」

ValueCommerceで優先的に提携申請する案件:
□ カー用品・タイヤ関連（Yahoo!ショッピング系が充実）
□ 日用品・ホームセンター系
□ 不用品買取・リサイクル系
```

---

#### ⑤ アクセストレード ―― 既存アカウントにサイト追加

```
ログイン先: https://www.accesstrade.ne.jp
作業: メディア管理 → 「メディアを追加」

アクセストレードで優先的に提携申請する案件:
□ リフォーム・住宅関連（高単価CPA案件が充実）
□ 車買取・査定系
□ ペット保険・ペット用品
```

---

#### ⑥ Amazonアソシエイト本家 ―― 新規申請（要180日以内3販売）

```
URL: https://affiliate.amazon.co.jp
※ このWebアプリでは未申請。新規申請が必要。

審査条件（2026年3月時点・確認済み）:
□ 登録後180日以内に3件の適格販売
□ 最低10件のオリジナルコンテンツ（/guide/記事で満たす）
□ 60日以内のコンテンツ更新
□ プライバシーポリシーにアマゾン参加の明記
□ 運営者情報の掲載

申請時のURL: https://example.com/guide/
アソシエイトID取得後: Cloudflare Pagesのシークレットに AMAZON_ASSOCIATE_ID を設定
```

**180日以内3販売の最速達成戦略:**

```
購買意図が最高のキーワードで1〜2記事を作り込む。
例: 「フローリング 補修マーカー おすすめ」
    → 商品比較記事にAmazonリンクを2〜3箇所
    → SNSでシェアして初期流入を作る
    → 90PV以内での3販売は実例あり（ファクトチェック済み）
```

---

#### ⑦ Googleアドセンス ―― 新規申請（コンテンツ10記事以上が実質要件）

```
URL: https://adsense.google.com
申請タイミング: /guide/ に10記事公開後（記事はAI骨格+手直し済みのもの）
審査期間: 1〜14日（再審査含め1〜2ヶ月かかる場合も）

審査コード埋め込みはStep Dで自動化済み
承認後: AdUnit.astroを記事ページに配置
役割: 購買意図が低いアプリ（ゴミ分別等）の補完収益
```

### 6-4. affiliate-programs.json（案件管理台帳）

> **ステータス凡例**
> `account_registered` = 別アプリで会員登録済み・**このサイトへの追加が必要**
> `approved` = このサイトで利用可能
> `pending` = 未申請

```json
{
  "programs": [
    {
      "id": "a8-base",
      "name": "A8.net（ベース登録）",
      "asp": "a8",
      "status": "account_registered",
      "site_add_required": true,
      "media_url": "https://example.com/guide/"
    },
    {
      "id": "moshimo-base",
      "name": "もしもアフィリエイト",
      "asp": "moshimo",
      "status": "account_registered",
      "site_add_required": true,
      "media_url": "https://example.com/guide/"
    },
    {
      "id": "rakuten-base",
      "name": "楽天アフィリエイト",
      "asp": "rakuten-direct",
      "status": "account_registered",
      "site_add_required": true,
      "affiliate_id": "",
      "cookie_days": 30
    },
    {
      "id": "valuecommerce-base",
      "name": "ValueCommerce",
      "asp": "valuecommerce",
      "status": "account_registered",
      "site_add_required": true
    },
    {
      "id": "accesstrade-base",
      "name": "アクセストレード",
      "asp": "accesstrade",
      "status": "account_registered",
      "site_add_required": true
    },
    {
      "id": "amazon-associate",
      "name": "Amazonアソシエイト（本家）",
      "asp": "amazon-direct",
      "status": "pending",
      "associate_id": "",
      "applied_url": "https://example.com/guide/",
      "applied_at": null,
      "deadline_180day": null,
      "sales_count": 0,
      "sales_needed": 3
    },
    {
      "id": "google-adsense",
      "name": "Googleアドセンス",
      "asp": "google",
      "status": "pending",
      "client_id": ""
    }
  ]
}
```

---

## 7. SNS・集客設計

### 7-1. プラットフォーム別役割

| SNS | 役割 | 向いている題材 |
|-----|------|-------------|
| **X（Twitter）** | バズ・即時流入 | 食品診断・魚判定・面白系 |
| **Instagram** | ビジュアル・ブランディング | DIY補修・植物・ファッション |
| **TikTok** | 若年層・発見流入 | カビ・タイヤ・魚判定 |
| **Pinterest** | 長期流入（SEO類似） | DIY補修・革製品・外壁 |

### 7-2. 静的OGP画像（Satori廃止後）

各アプリの `public/og/[appId].png` に静的OGP画像を用意する。
動的OGP（診断結果ごとの画像）は Phase 2以降に必要性を判断してから追加する。

```astro
<!-- src/layouts/Base.astro -->
<meta property="og:image" content={`/og/${appId}.png`} />
```

### 7-3. 季節連動コンテンツカレンダー

```
1〜2月: カビ（結露シーズン）、タイヤ（雪道）
3〜4月: 外壁診断（外装リフォームシーズン）
5〜6月: 植物病気（ガーデニングシーズン）
7〜8月: 食品診断（食中毒シーズン）← バズ最大期
9〜10月: タイヤ摩耗（冬タイヤ交換シーズン）← 収益最大期
11〜12月: 古着・骨董（断捨離・大掃除シーズン）
```

---

## 8. コスト・収益シミュレーション

### 8-1. コスト（月次・Approach A適用後）

| 項目 | 旧プラン | **Approach A** | 備考 |
|------|---------|--------------|------|
| Cloudflare Pages + Functions | $0 | $0 | 無料枠内 |
| Claude API（月10,000診断） | ~$40〜55 | **~$10〜15** | Haiku固定 + 画像リサイズ + Prompt Caching |
| ドメイン | ~1,000円 | ~1,000円 | 年払い換算 |
| **合計** | **~7,000〜9,000円/月** | **~2,500〜3,500円/月** | |

### 8-2. コスト削減の内訳

```
画像リサイズ（長辺800px）:  ~35〜50% 削減
Haiku固定（Sonnet比）:      ~67% 削減
Prompt Caching:              ~$13.5/月 削減

3施策合計: 旧$40〜55 → 新$10〜15（▲70〜75%）
```

### 8-3. 損益分岐の現実

```
月3,500円のAPIコストを回収するには:

パターンA（アフィリエイト主体）:
  月20,000PV × CTR15% × CVR3% × 単価1,500円 × 報酬率4% = 5,400円/月
  → 月2万PVで黒字化（旧プランの10万PVから大幅に下がった）

パターンB（CPA主体）:
  月100診断 × CVR8% × CPA単価1,500円 = 12,000円/月
  → タイヤ診断（月100診断）で黒字化可能

パターンC（AdSense補完）:
  月5,000PV × RPM300円 = 1,500円/月
  → アフィリエイトの補完として機能
```

### 8-4. Amazonアソシエイト報酬率（2026年3月時点）

| カテゴリ | 報酬率 | 対応アプリ |
|---------|--------|----------|
| ファッション小物 | 8% | vintage-fashion |
| ドラッグストア・ビューティー | 6% | kabi-diagnosis |
| ホーム・キッチン | 4% | diy-repair |
| ツール・DIY | 4% | diy-repair |
| Cookie有効期間 | **24時間** | ← 短いことに注意（楽天は30日） |

---

## 9. 月次運用スクリプト

```bash
claude "scripts/report-monthly.py を実装してください。

機能:
1. src/configs/affiliate-programs.json を読み込み
2. 各ASPの状況をステータス別に表示
3. Amazonアソシエイトの180日期限をカウントダウン表示
4. 承認済み案件でIDが未設定のものを警告
5. 結果をMarkdownとして出力

実行方法: python3 scripts/report-monthly.py"
```

---

## 10. 全工程チェックリスト（Approach A版）

### Phase 0：プロジェクト初期化（Day 1 午前）
```
□ npm init + Astro インストール
□ @astrojs/cloudflare + @astrojs/react + @astrojs/mdx をインストール
□ astro.config.mjs を output: "server" + cloudflare adapter で設定
□ src/configs/ に diy-repair.json + kabi-diagnosis.json を作成
□ Cloudflare Pages にデプロイ（公開状態にする）
□ Cloudflare Pages ダッシュボードで ANTHROPIC_API_KEY シークレットを設定
```

### Phase 1：審査準備コンテンツ（Day 1 午後）
```
□ Step A: 必須4ページ生成（privacy/terms/contact/about）
□ Step B: SEO記事10本生成・MDXとして配置
□ Step C: AmazonLinkコンポーネント作成・記事に設置
□ Step D: AdSenseコード埋め込み
□ フッターにアフィリエイト表示を全ページ自動挿入
□ /guide/ に全記事が表示されることを確認
□ 記事の手直し（AI骨格を人間が加筆・修正）← AdSense審査品質のため必須
```

### Phase 2：既登録ASPへのサイト追加（Day 1 午後）
```
前提: Cloudflare Pagesにデプロイ済み（サイトが公開状態）であること

□ A8.net → https://example.com/guide/ を追加
□ もしもアフィリエイト → https://example.com/guide/ を追加
□ 楽天アフィリエイト → https://example.com/guide/ を追加
□ ValueCommerce → https://example.com/guide/ を追加
□ アクセストレード → https://example.com/guide/ を追加
```

### Phase 3：新規申請（Day 2〜）
```
□ Amazonアソシエイト本家（新規・要申請）
   └ 申請URL: https://example.com/guide/
   └ 申請日をカレンダーに登録（180日期限の管理）
   └ ID取得後: Cloudflare Pages シークレットに AMAZON_ASSOCIATE_ID を設定
□ もしもアフィリエイト経由Amazonも同時申請（保険）
□ Googleアドセンス申請（10記事公開後）
```

### Phase 4：DIY補修アプリ本体（Week 1）
```
□ src/pages/api/[appId]/analyze.ts 動作確認
□ src/configs/diy-repair.json の設定確認
□ ImageUploader.tsx（クライアント側リサイズ込み）実装
□ DiagnosisResult.tsx 実装
□ AffiliateBlock.tsx 実装
□ 静的OGP画像（public/og/diy-repair.png）作成
□ レートリミット動作確認（日5回制限）
□ Claude APIの529エラー時リトライ動作確認
```

### Phase 5：2本目（Week 2）
```
□ src/configs/kabi-diagnosis.json を追加
□ src/configs/index.ts に1行追加
□ デプロイ → 「設定追加だけで動く」を確認
```

### Phase 6：CPA案件・収益最大化（Week 3〜）
```
□ A8.netでタイヤ案件のCPA URLを取得
□ src/configs/tire-check.json のcpa_urlに設定・デプロイ
□ 月次レポートスクリプトを実行して収益確認
□ パフォーマンス低案件のリンクを入れ替え
```

---

## 11. 既知のリスクと対処

| リスク | 内容 | 対処 |
|--------|------|------|
| Amazon審査落ち | コンテンツ不足が最多原因 | 記事5本追加してから再申請（回数制限なし） |
| 180日以内に3販売未達 | 流入が少ない初期に起こりがち | 購買意図最高の1記事に集中・SNSで初期流入を作る |
| Claude API 529過負荷 | アクセス集中時 | 指数バックオフ実装済み（claude.ts） |
| 個人情報含む画像の投稿 | 顔写真・書類等 | 利用規約に明記＋サーバー非保存を徹底 |
| ステマ表示義務 | 2023年10月〜景品表示法 | フッター自動挿入で対応済み |
| Haikuの診断精度不足 | 複雑な損傷・判断困難な画像 | `src/lib/claude.ts` の MODEL を sonnet に変更して再デプロイ |
| レートリミット（インメモリ） | Workerが複数インスタンスの場合に制限がズレる | スケール時にCloudflare KVに差し替え |
| AdSense審査落ち | AI記事のみは審査が厳しい | 記事の手直し（AI骨格+人間加筆）で品質を上げてから再申請 |
| A8.netのX禁止 | A8のリンクはXに貼れない | Amazon本家リンク（Xは本家OKだがステマ表示必須） |
| ホームプロの収益構造 | 依頼ではなく成約時に報酬1% | タウンライフリフォーム等の依頼ベースCPAを優先 |

---

## 12. コスト最適化（実装済みのもの）

Approach Aではアーキテクチャレベルでコストを削減済み。追加施策は以下のみ。

### 施策A：画像リサイズ（クライアント側・最優先）

```typescript
// src/components/ImageUploader.tsx
async function resizeBeforeUpload(file: File): Promise<string> {
  const canvas = document.createElement("canvas");
  const img = await createImageBitmap(file);

  const MAX = 800;
  const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
  canvas.width  = Math.round(img.width  * ratio);
  canvas.height = Math.round(img.height * ratio);

  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}
```

効果:
```
3000×4000px → ~$0.048/枚
800× 600px  → ~$0.002/枚
削減率: ~96%（実効35〜50%）
```

### 施策B：Prompt Caching

`src/lib/claude.ts` の実装済み（`cache_control: { type: "ephemeral" }`）。
追加作業不要。効果: ~$3〜5/月の削減（月10,000診断時）。

### 施策C：重複リクエストキャッシュ

```typescript
// src/components/ImageUploader.tsx
async function getOrFetchDiagnosis(file: File, appId: string) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hash = btoa(String.fromCharCode(...new Uint8Array(buf))).slice(0, 16);
  const cacheKey = `result:${appId}:${hash}`;

  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < 5 * 60 * 1000) return data;
  }

  const result = await callDiagnosisAPI(file, appId);
  sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, ts: Date.now() }));
  return result;
}
```

### 最適化後コスト目標

```
施策A のみ:      ~$5〜8/月
施策A + B + C:   ~$3〜6/月  ← 推奨ゴール
```

---

## 13. 将来的なスケールアップ（Approach A → B への移行）

初期アプリが10本を超えたり、設定をデプロイなしで変えたくなった場合:

```
1. Cloudflare KV ネームスペースを作成
2. src/configs/ の静的JSONをKVに移行
3. src/pages/api/[appId]/analyze.ts の getConfig() をKV参照に変更
   const configRaw = await env.APP_CONFIG.get(`app:${appId}`);
```

Workerを別プロジェクトに分離する必要はない。Pages FunctionsはそのままKVにアクセスできる。

---

## 14. 補足：Claude in Chrome の活用シーン

自動操作（フォーム自動送信等）は各サービスの規約違反になるため、
**「Claude in Chromeが提案→人間が実行」** のスタイルで使う。

```
登録フォームを開いた状態で Claude in Chrome を起動し:
→ 「このフォームの説明欄に入力する200字の文章を生成して」
→ 生成された文章をコピペして手動入力

審査落ちメールが届いたら:
→ Claude in Chrome に見せながら
   「このメールの却下理由と、私のサイト [URL] の改善点を3つ挙げて」

各ASPのダッシュボードを開いた状態で:
→ 「今月の収益サマリーを日本語で300字にまとめて」

コスト確認時:
→ Anthropic Console を開いた状態で
   「今月のAPIコストの内訳を読んで、最もコストが高い時間帯とアプリを教えて」
```

---

*記載の料金・審査条件は2026年3月30日調査時点。各サービス公式ページで最新情報を確認すること。*
