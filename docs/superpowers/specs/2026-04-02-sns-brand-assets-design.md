---
title: SNSブランドアセット設計
date: 2026-04-02
status: approved
---

# SNSブランドアセット設計 — 撮偵

## 出力ファイル

| ファイル | 用途 | サイズ |
|---------|------|--------|
| `docs/sns-brand/icon.svg` | X・Instagram プロフィールアイコン（共通） | 400×400px |
| `docs/sns-brand/x-header.svg` | X（Twitter）ヘッダー画像 | 1500×500px |

## デザイン仕様

### カラーパレット（サイトと統一）

| トークン | 値 | 用途 |
|---------|-----|------|
| Coral Orange | `#E5604A` | メインカラー・背景・シンボル |
| White | `#FFFFFF` | カメラ・虫眼鏡フレーム |
| Dark Text | `#333333` | メインコピー |
| Muted Text | `#888888` | サブコピー |
| Faint Text | `#BBBBBB` | URL |
| BG Light | `#F8F8F8` | ヘッダー背景 |

### フォント

`M PLUS Rounded 1c`（Google Fonts）— サイト本文と同一。
フォールバック: `Hiragino Kaku Gothic Pro` → `Yu Gothic` → `sans-serif`

### アイコン構成

```
[コーラルオレンジ 円背景]
  ├── 白カメラボディ（角丸長方形）
  │     ├── ビューファインダー突起（上部）
  │     ├── レンズ（白外円 + オレンジ内円）
  │     └── フラッシュ（上右）
  └── 白虫眼鏡（右下、カメラと重なる）
        ├── フレーム円（白）
        ├── レンズ内（オレンジ）
        └── ハンドル（45°方向）
```

### ヘッダー構成

```
[左 37%] カメラ+虫眼鏡シンボル（オレンジ on ライトグレー）
[区切り] 縦線（淡いオレンジ）
[右 63%] 撮偵（120px / #E5604A）
         写真1枚でAIが解決策を診断（36px / #333333）
         壁キズ・カビ・タイヤ｜無料AI診断（26px / #888888）
         satsu-tei.com（22px / #BBBBBB）
```

---

## アカウント設定

### X（Twitter）

| 項目 | 値 |
|-----|-----|
| ハンドル | `@satsu_tei` |
| 表示名 | `撮偵 \| AI診断ツール` |
| プロフィール文 | 写真1枚でAIが解決策を診断📷 壁キズ・カビ・タイヤなど無料で使えるAI診断ツール集。賃貸DIYの悩みを即解決。登録不要 |
| ウェブサイト | `https://satsu-tei.com` |
| 場所 | Japan |
| プロフィール画像 | `docs/sns-brand/icon.svg`（PNG変換して使用） |
| ヘッダー画像 | `docs/sns-brand/x-header.svg`（PNG変換して使用） |

### Instagram

| 項目 | 値 |
|-----|-----|
| ハンドル | `@satsu_tei` |
| 表示名 | `撮偵｜AI診断ツール` |
| カテゴリ | 科学技術・工学 |
| プロフィール文（改行あり） | 写真1枚でAIが解決策を診断📷<br>壁キズ・カビ・タイヤ｜登録不要・完全無料✅<br>👇 リンクから診断 |
| リンク | `https://satsu-tei.com` |
| プロフィール画像 | `docs/sns-brand/icon.svg`（PNG変換して使用） |

---

## SVG → PNG 変換手順

SNSにアップロードする際はPNGへ変換する。推奨ツール:

```bash
# Inkscape CLI（インストール済みの場合）
inkscape docs/sns-brand/icon.svg --export-png=docs/sns-brand/icon.png --export-width=400
inkscape docs/sns-brand/x-header.svg --export-png=docs/sns-brand/x-header.png --export-width=1500

# または ブラウザで SVG を開いて「名前を付けて保存」→ スクリーンショット
```

---

## 備考

- Instagramにヘッダー画像は存在しないため、アイコンのみ使用。
- アイコンはXの「円形クロップ」・Instagramの「円形表示」どちらにも対応した構図。
- 将来的にPinterestボードを開設する場合も同アイコンを転用可能。
