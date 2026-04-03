# さつてい

住まいのキズやカビを画像から診断する Astro + React + Cloudflare Workers ベースの Web アプリです。

## セットアップ

```sh
npm install
cp .env.example .dev.vars
```

必要な主な環境変数:

- `ANTHROPIC_API_KEY`
- `AMAZON_ASSOCIATE_ID`
- `RAKUTEN_AFFILIATE_ID`
- `EXPECTED_ORIGIN`
- `PUBLIC_GA_ID`
- `PUBLIC_ADSENSE_CLIENT_ID`

## 開発コマンド

```sh
npm run dev
npm test
npm run check
npm run build
npm run check:text
```

## 技術スタック

- Astro 6
- React 19
- TypeScript
- Cloudflare Workers / Durable Objects / KV
- Vitest

## ディレクトリ概要

- `src/pages`: ルーティングと静的ページ
- `src/components`: UI コンポーネント
- `src/lib`: 診断処理、Claude 連携、レート制限、型
- `src/configs`: 診断アプリごとの設定
- `src/content/guide`: ガイド記事
- `src/worker.ts`: Cloudflare Workers エントリーポイント

## デプロイ

Cloudflare Workers 向けにビルドされます。`wrangler.toml` に Durable Object と KV の設定があります。

## 品質ゲート

- `npm test`: 単体テスト
- `npm run check`: Astro / TypeScript 診断
- `npm run build`: 本番ビルド確認
- `npm run check:text`: 文字化け検知
