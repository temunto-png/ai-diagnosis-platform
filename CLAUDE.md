# AI Diagnosis Platform (satsu-tei.com)

画像AI診断プラットフォーム。ユーザーが写真をアップロードすると Claude Haiku が分析し、診断結果+アフィリエイトリンクを返す。

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 6 (SSR, `output: "server"`) |
| UI | React 19 (`client:load` は DiagnosisApp のみ) |
| Content | MDX (guide 記事), JSON (アプリ設定) |
| Deploy | Cloudflare Pages + Workers |
| Storage | Cloudflare KV (rate-limit, cache) |
| AI | Anthropic API (`claude-haiku-4-5-20251001`) |
| Test | Vitest 4 (`vitest run`) |
| Type check | `npx astro check` + `npx tsc --noEmit` |

## Commands

```bash
npm run dev        # localhost:4321
npm run build      # Astro + Cloudflare Workers ビルド
npm run preview    # ビルド済みのローカルプレビュー
npm test           # vitest run (src/**/*.test.ts)
npx astro check    # Astro 型チェック
npx tsc --noEmit   # TypeScript 型チェック
```

**Feedback loop（変更後は必ず）:** `npx tsc --noEmit && npm test`

## Architecture

```
src/
├── pages/
│   ├── [appId]/index.astro        # 診断ツールページ (prerender)
│   ├── [appId]/result/[uuid].astro # 結果表示ページ (prerender)
│   ├── api/[appId]/analyze.ts      # POST: Claude API 呼び出し (SSR)
│   └── guide/[slug].astro          # ガイド記事 (prerender)
├── components/
│   ├── DiagnosisApp.tsx            # React: 診断フロー全体
│   ├── ImageUploader.tsx           # React: 画像アップロード+リサイズ
│   └── DiagnosisResult.tsx         # React: 結果表示
├── lib/
│   ├── claude.ts                   # Claude API クライアント (retry, token制限)
│   ├── rate-limit.ts               # KV + in-memory フォールバック
│   └── monetization.ts             # アフィリエイトURL生成
├── configs/
│   ├── diy-repair.json             # DIY修理アプリ設定
│   └── kabi-diagnosis.json         # カビ診断アプリ設定
└── content/guide/*.mdx             # ガイド記事 (Zod schema)
social/                             # SNS自動投稿 (別package.json)
```

### データフロー

1. 画像アップロード → クライアント側リサイズ (max 800px) → base64
2. `sessionStorage` キャッシュ確認 (5分TTL)
3. POST `/api/[appId]/analyze` → rate-limit チェック → Claude API
4. レスポンスに monetization ルールを適用 → アフィリエイトリンク付き結果
5. オプション: KV キャッシュ (SHA-256 hash key)

### アプリ追加パターン

新しい診断アプリを追加するには：
1. `src/configs/new-app.json` を既存 JSON を参考に作成
2. `public/og/new-app.png` に OGP 画像を配置
3. `src/pages/index.astro` のアプリ一覧に自動で表示される（`listApps()` で取得）

## Key Conventions

- **Rendering**: 静的ページは `export const prerender = true`、API エンドポイントは SSR
- **Cloudflare env**: `import { env } from "cloudflare:workers"` で環境変数にアクセス
- **Config JSON**: `{{variable}}` テンプレート構文でプロンプトにコンテキスト変数を埋め込み
- **Monetization**: condition-based ルールマッチング。最初に一致した条件が適用、`"default"` がフォールバック
- **テストファイル**: ソースと同階層に `*.test.ts` で配置
- **CSS**: Astro scoped CSS + CSS custom properties (`--primary: #FF5E2A`)。フレームワーク不使用
- **フォント**: M PLUS Rounded 1c (見出し) + Noto Sans JP (本文)
- **言語**: UI・コンテンツ・SEO は全て日本語

## Environment

- `.dev.vars` — ローカル開発用シークレット（**git 管理外**）
- `.env.example` — 公開可能な設定のテンプレート
- `wrangler.toml` — KV バインディング定義

必要な環境変数: `ANTHROPIC_API_KEY`, `AMAZON_ASSOCIATE_ID`, `RAKUTEN_AFFILIATE_ID`

## Deployment

```bash
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

本番: `satsu-tei.com` (Cloudflare Pages)
CI: `.github/workflows/` に SNS 自動投稿 + トークンリフレッシュ

## Gotchas

- `social/` は独立した package.json を持つサブプロジェクト。ルートの `npm install` では依存が入らない
- Claude API の 529 (overloaded) は最大3回リトライ（指数バックオフ 1s→2s→4s）
- KV が利用不可の場合は in-memory フォールバック。ローカル開発では常にこのパス
- `DIAGNOSIS_CACHE_KV` は wrangler.toml でコメントアウト中。有効化には KV namespace 作成が必要
- 画像は base64 JPEG で送信。クライアント側で 800px にリサイズ済み
