# Worktree 構成管理システム 設計書

**作成日**: 2026-04-07
**ステータス**: 承認済み

---

## 問題定義

### 根本原因

- マージ済み worktree が自動削除されず累積する
- セッションをまたぐと「どの worktree が何のためか」が不明になる
- マージ漏れは能動的に確認しないと気づかない（致命的）

### 設計思想

> **「不正な状態を表現不可能にせよ」**
> マージ漏れは「検出が遅い」のではなく「見えない状態が存在できる」ことが問題。

---

## アーキテクチャ

```
セッション開始
    ↓
① Health Check Hook（PreToolUse）
    ↓
git branch --merged（権威: マージ判定）
    +
.claude/worktrees.json（目的・PR番号記録）
    ↓
② 状態分類エンジン
    MERGED    → worktree + ブランチ 自動削除
    PR_OPEN   → スキップ
    ACTIVE    → スキップ
    ABANDONED → 🚨 Agent ツールをブロック（exit 1）
```

**設計判断**: `status` フィールドはヒントに過ぎない。Health Check は常に `git branch --merged` で判定を上書きする。レジストリと git が矛盾した場合は **git が勝つ**。

---

## 状態定義

| 状態 | 条件 | 自動アクション |
|------|------|--------------|
| `MERGED` | ブランチが master にマージ済み | worktree + ローカルブランチを自動削除 |
| `PR_OPEN` | 未マージ・PR あり | 何もしない |
| `ACTIVE` | 未マージ・PR なし・3日以内 | 何もしない |
| `ABANDONED` | 未マージ・PR なし・3日超過 | 🚨 セッション冒頭で警告。Agent ツールをブロック |

---

## ファイル構成

```
.claude/
├── worktrees.json          # Registry（目的・PR番号・状態）
└── scripts/
    ├── worktree-health.sh  # Health Check（セッション開始時自動実行）
    ├── worktree-register.sh # Registry 登録（worktree 作成時）
    └── worktree-set-pr.sh  # Registry 更新（PR 作成時）
```

---

## Registry フォーマット

`.claude/worktrees.json`

```json
{
  "worktrees": {
    "<worktree-name>": {
      "branch": "claude/<worktree-name>",
      "purpose": "タスクの説明",
      "created_at": "2026-04-07T00:00:00Z",
      "pr_number": null,
      "status": "ACTIVE"
    }
  },
  "config": {
    "abandoned_threshold_days": 3,
    "base_branch": "master"
  }
}
```

---

## スクリプト仕様

### worktree-health.sh

**役割**: 全 worktree をスキャンし状態分類・自動処理を行う
**実行タイミング**: セッション開始時（PreToolUse Hook で Agent ツール起動前）
**終了コード**: 0 = クリーン、1 = ABANDONED 検出（作業ブロック）

```bash
#!/bin/bash
set -euo pipefail

BASE_BRANCH="master"
ABANDONED_DAYS=3
HAS_CRITICAL=0

git fetch origin --quiet

echo "=== Worktree Health Check ==="

while IFS= read -r worktree_path; do
  [[ "$worktree_path" == "$(git rev-parse --show-toplevel)" ]] && continue

  branch=$(git -C "$worktree_path" branch --show-current 2>/dev/null || echo "DETACHED")
  name=$(basename "$worktree_path")

  # マージ判定はgitに委ねる（権威）。fetch済みの origin/master を参照する
  if git branch --merged "origin/$BASE_BRANCH" | grep -q "  $branch$"; then
    echo "✅ MERGED    [$name] $branch → 自動削除"
    git worktree remove "$worktree_path" --force
    git branch -d "$branch" 2>/dev/null || true
    continue
  fi

  # PR確認
  pr=$(gh pr list --head "$branch" --json number,state -q '.[0].number' 2>/dev/null || echo "")
  if [[ -n "$pr" ]]; then
    echo "🔵 PR_OPEN   [$name] $branch → PR #$pr"
    continue
  fi

  # 最終コミットからの経過日数
  last_commit_days=$(( ( $(date +%s) - $(git -C "$worktree_path" log -1 --format=%ct) ) / 86400 ))

  if [[ $last_commit_days -ge $ABANDONED_DAYS ]]; then
    echo "🚨 ABANDONED [$name] $branch → ${last_commit_days}日間放置 PRなし 作業消失リスク"
    HAS_CRITICAL=1
  else
    echo "🟡 ACTIVE    [$name] $branch → ${last_commit_days}日目"
  fi

done < <(git worktree list --porcelain | grep "^worktree " | awk '{print $2}')

echo "=============================="

if [[ $HAS_CRITICAL -eq 1 ]]; then
  echo ""
  echo "🚨 ABANDONED worktree が存在します。マージまたは破棄を決定してから作業を開始してください。"
  exit 1
fi

exit 0
```

### worktree-register.sh

**役割**: worktree 作成時に Registry へ登録
**呼び出し**: `using-git-worktrees` スキルの worktree 作成ステップ直後

```bash
#!/bin/bash
# 使用方法: bash .claude/scripts/worktree-register.sh <name> <branch> <purpose>
NAME=$1; BRANCH=$2; PURPOSE=$3
REGISTRY=".claude/worktrees.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq --arg name "$NAME" \
   --arg branch "$BRANCH" \
   --arg purpose "$PURPOSE" \
   --arg ts "$TIMESTAMP" \
   '.worktrees[$name] = {branch: $branch, purpose: $purpose, created_at: $ts, pr_number: null, status: "ACTIVE"}' \
   "$REGISTRY" > tmp.json && mv tmp.json "$REGISTRY"

echo "✅ Registry 登録: [$NAME] $PURPOSE"
```

### worktree-set-pr.sh

**役割**: PR 作成時に Registry を更新
**呼び出し**: `finishing-a-development-branch` スキルの PR 作成ステップ直後

```bash
#!/bin/bash
# 使用方法: bash .claude/scripts/worktree-set-pr.sh <name> <pr_number>
NAME=$1; PR=$2
REGISTRY=".claude/worktrees.json"

jq --arg name "$NAME" --argjson pr "$PR" \
   '.worktrees[$name].pr_number = $pr | .worktrees[$name].status = "PR_OPEN"' \
   "$REGISTRY" > tmp.json && mv tmp.json "$REGISTRY"

echo "✅ Registry 更新: [$NAME] → PR #$PR"
```

---

## Hook 設定

`.claude/settings.json` の `hooks` セクションに追加：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": [{
          "type": "command",
          "command": "bash .claude/scripts/worktree-health.sh"
        }]
      }
    ]
  }
}
```

---

## ライフサイクル全体図

```
using-git-worktrees スキル
        ↓ worktree 作成
worktree-register.sh  → Registry: ACTIVE
        ↓ 実装・コミット
finishing-a-development-branch スキル
        ↓ PR 作成
worktree-set-pr.sh    → Registry: PR_OPEN
        ↓ GitHub でマージ
次セッション開始
        ↓ PreToolUse Hook
worktree-health.sh    → git判定: MERGED → 自動削除 → クリーン ✅
```

---

## スキル更新対応

| スキル | 追加アクション |
|--------|--------------|
| `using-git-worktrees` | worktree 作成後に `worktree-register.sh` を実行 |
| `finishing-a-development-branch` | PR 作成後に `worktree-set-pr.sh` を実行 |

---

## 初期セットアップ手順

```bash
# 1. ディレクトリ作成
mkdir -p .claude/scripts

# 2. Registry 初期化
cat > .claude/worktrees.json << 'EOF'
{
  "worktrees": {},
  "config": {
    "abandoned_threshold_days": 3,
    "base_branch": "master"
  }
}
EOF

# 3. スクリプト3本を配置（本設計書の内容をそのまま使用）

# 4. 実行権限付与
chmod +x .claude/scripts/*.sh

# 5. settings.json に PreToolUse Hook を追加

# 6. 初回 Health Check 実行（既存 worktree を一括クリーンアップ）
bash .claude/scripts/worktree-health.sh
```

---

## 課題対応マトリクス

| 課題 | 解決策 | 効果 |
|------|--------|------|
| マージ漏れが気づかない | セッション開始時に git で全 worktree をスキャン | 次のセッション冒頭で必ず発覚 |
| ABANDONED でも作業継続できてしまう | exit 1 で Agent ツールをブロック | 対処なしに新タスク開始不可 |
| マージ済み worktree が残り続ける | MERGED 判定で自動削除 | 手動クリーンアップ不要 |
| 「何のための worktree か」不明 | Registry に purpose を記録 | 即座に目的を把握可能 |
| セッション間で文脈が失われる | progress.md + Registry の二層管理 | 状態は git、目的は Registry |
