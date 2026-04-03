# SNS自動投稿システム 設計ドキュメント

作成日: 2026-04-02
ステータス: 設計完了・実装プラン待ち

---

## 概要

撮偵（satsu-tei.com）のInstagram・X（Twitter）への完全自動投稿システム。
`content-calendar.yml` に基づき、GitHub Actions が毎朝9時（JST）に起動し、Claude APIで投稿文を生成して両プラットフォームに投稿する。

---

## セクション1: 全体アーキテクチャ

### ディレクトリ構成

```
social/
  content-calendar.yml       # 投稿スケジュール定義
  package.json
  tsconfig.json
  scripts/
    run.ts                   # エントリーポイント
    generate-post.ts         # Claude API でテキスト生成
    post-x.ts                # X API 投稿
    post-instagram.ts        # Instagram Graph API 投稿
.github/workflows/
  social-post.yml            # cron: 毎朝9:00 JST (UTC 0:00)
```

### 実行フロー

```
GitHub Actions (毎朝9:00 JST)
  └→ content-calendar.yml を読む
       └→ 今日の投稿予定があるか？
            ├─ なし → 終了（exit 0）
            └─ あり → generate-post.ts（Claude API）
                         ├─ post-x.ts（X API）
                         └─ post-instagram.ts（Instagram Graph API）
```

### API依存関係

| サービス | ライブラリ | 認証方式 |
|---------|-----------|---------|
| X | `twitter-api-v2` | OAuth 1.0a（API Key/Secret + Access Token/Secret） |
| Instagram | Graph API（fetch直接） | Long-lived Access Token（60日で失効→自動更新） |
| Claude | `@anthropic-ai/sdk` | API Key |

---

## セクション2: content-calendar.yml フォーマット

```yaml
posts:
  - date: "2026-04-07"
    platforms: [x, instagram]
    type: article-promo        # 記事紹介
    slug: drain-clog-removal

  - date: "2026-04-09"
    platforms: [x]
    type: tips                 # 豆知識
    slug: wallpaper-repair

  - date: "2026-04-11"
    platforms: [x]
    type: rental-aru-aru       # 賃貸あるある（slug不要）
    slug: null

  - date: "2026-04-14"
    platforms: [x, instagram]
    type: seasonal             # 季節ネタ
    slug: black-mold-removal
```

### 投稿タイプ一覧

| type | 説明 | 対応プラットフォーム |
|------|------|-------------------|
| `article-promo` | ガイド記事の紹介投稿 | X + Instagram |
| `tips` | 記事から抽出した豆知識1〜3点 | X |
| `rental-aru-aru` | 「賃貸あるある」共感系ネタ | X |
| `seasonal` | 梅雨・冬タイヤ等の季節連動ネタ | X + Instagram |

`slug: null` の場合、Claude APIがtypeに応じてフリー生成する。

---

## セクション3: テキスト生成ロジック（Claude API）

### generate-post.ts の処理フロー

1. `content-calendar.yml` から今日のエントリを取得
2. `slug` があれば対応するMDXファイルを読み込み（title/description/category）
3. プラットフォーム × 投稿タイプに応じたプロンプトを構築
4. `claude-haiku-4-5-20251001` に送信（コスト最小化）
5. X用テキスト + Instagram用キャプションをJSON形式で返す

### プロンプト設計

**System prompt:**
```
あなたは「撮偵」（satsu-tei.com）のSNS担当です。
ブランドボイス: 親しみやすい・実用的・DIY初心者向け
禁止事項: 誇大表現・価格の明記・保証表現・絵文字の乱用
```

**User prompt（article-promo の例）:**
```
記事タイトル: {title}
概要: {description}
カテゴリ: {category}
投稿タイプ: article-promo

以下をJSON形式で生成してください：
{
  "x": "X投稿文（140字以内・URL除く・末尾にハッシュタグ3〜5個）",
  "instagram": "キャプション（300字以内・末尾にハッシュタグ10〜15個）"
}
URLプレースホルダー: {{url}}
```

### ハッシュタグプール

- コア: `#DIY補修` `#壁紙補修` `#賃貸DIY` `#原状回復` `#カビ対策`
- リーチ拡大: `#暮らしのヒント` `#住まい` `#節約` `#DIYer`
- ブランド: `#撮偵` `#AI診断`

### 出力形式

```json
{
  "x": "退去前に焦らないために🔧\n賃貸の壁紙補修、実は自分でできます。\n詳しい手順→ {{url}}\n#賃貸DIY #壁紙補修 #原状回復",
  "instagram": "退去前の壁紙補修、意外と自分でできます✨\n...\n#賃貸DIY #壁紙補修 ..."
}
```

---

## セクション4: プラットフォームアダプター

### X（post-x.ts）

- ライブラリ: `twitter-api-v2`
- 投稿: `client.v2.tweet(text)`
- URLはテキスト末尾に付与: `https://satsu-tei.com/guide/{slug}/`
- レート制限: Free tier 1,500件/月（週5投稿≒月20件、余裕あり）

### Instagram（post-instagram.ts）

2ステップ投稿フロー:
1. `POST /{ig-user-id}/media` — `image_url`（OGP画像URL）+ `caption`
2. `POST /{ig-user-id}/media_publish` — `creation_id`

OGP画像URL取得: `https://satsu-tei.com/guide/{slug}/` の `og:image` メタタグをfetchして抽出。

**Long-lived Token 自動更新:**
- 有効期限7日前（残53日）に GitHub Actions が更新APIを叩き、新トークンをRepository Secretに書き戻す
- 更新ワークフロー: `social-token-refresh.yml`（月1回 cron）

---

## セクション5: GitHub Actions ワークフロー

```yaml
# .github/workflows/social-post.yml
name: SNS Auto Post

on:
  schedule:
    - cron: '0 0 * * *'   # 毎日9:00 JST (UTC 0:00)
  workflow_dispatch:        # 手動実行も可能

jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
        working-directory: social
      - name: Run auto post
        run: npx tsx scripts/run.ts
        working-directory: social
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          X_API_KEY: ${{ secrets.X_API_KEY }}
          X_API_SECRET: ${{ secrets.X_API_SECRET }}
          X_ACCESS_TOKEN: ${{ secrets.X_ACCESS_TOKEN }}
          X_ACCESS_SECRET: ${{ secrets.X_ACCESS_SECRET }}
          INSTAGRAM_USER_ID: ${{ secrets.INSTAGRAM_USER_ID }}
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
```

---

## セクション6: シークレット管理

| シークレット名 | 取得元 | 備考 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console | 既存（Cloudflare Workerと共用不可→別途発行推奨） |
| `X_API_KEY` | X Developer Portal | App作成後に取得 |
| `X_API_SECRET` | X Developer Portal | App作成後に取得 |
| `X_ACCESS_TOKEN` | X Developer Portal | OAuth 1.0a User Context |
| `X_ACCESS_SECRET` | X Developer Portal | OAuth 1.0a User Context |
| `INSTAGRAM_USER_ID` | Facebook Graph API Explorer | Instagram Business Account のID |
| `INSTAGRAM_ACCESS_TOKEN` | Facebook Developer | Long-lived Token（60日）、月次自動更新 |

全てGitHub Repository Settings → Secrets and variables → Actions に登録。コードへの直書き禁止。

---

## 前提条件（手動セットアップが必要）

実装前に以下を手動で完了させる必要がある:

1. **Xアカウント開設** + Developer Portal でApp作成（Free tier）
2. **Instagramアカウント開設**（Professional/Business）+ Facebookページとの連携
3. **Facebook Developer App 作成** + Instagram Graph API の有効化
4. 上記すべてのAPIキーを GitHub Secrets に登録

---

## 制約・注意事項

- Instagram Graph API は個人アカウントには使用不可（Business/Creator アカウント必須）
- X API Free tier は読み書き両対応だが、月1,500ツイートの上限あり
- Instagramへの投稿は画像必須（テキストのみ投稿は不可）
- OGP画像が存在しない記事（slug: null のケース）はInstagram投稿をスキップする
