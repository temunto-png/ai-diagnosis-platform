# Worktree 構成管理システム 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** セッション開始時に worktree の状態を自動スキャンし、マージ済みを自動削除・ABANDONED を即座にブロックする構成管理システムを構築する。

**Architecture:** git を権威（マージ判定）、`.claude/worktrees.json` を補助レジストリ（目的・PR番号）とするハイブリッド設計。PreToolUse Hook が Agent ツール起動前に Health Check を実行し、問題があれば作業をブロックする。`git rev-parse --git-common-dir` でどの worktree からでもメインプロジェクトルートを特定する。

**Tech Stack:** Bash, git, gh CLI, jq

**重要前提:**
- メインプロジェクト: `C:/tool/claude/ai-diagnosis-platform/`
- Worktree 格納先: `.claude/worktrees/<name>/`
- `.claude/` ディレクトリは `.gitignore` 対象（スクリプトはローカル専用）
- スキルは `~/.claude/skills/` に存在

---

## ファイル構成

| 操作 | パス | 役割 |
|------|------|------|
| Create | `C:/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-health.sh` | Health Check（セッション開始時自動実行） |
| Create | `C:/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-register.sh` | Registry 登録（worktree 作成時） |
| Create | `C:/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-set-pr.sh` | Registry 更新（PR 作成時） |
| Create | `C:/tool/claude/ai-diagnosis-platform/.claude/worktrees.json` | Registry（runtime state） |
| Modify | `C:/tool/claude/ai-diagnosis-platform/.claude/settings.json` | PreToolUse Hook 追加 |
| Modify | `.claude/settings.json`（各 worktree） | PreToolUse Hook 追加 |
| Modify | `~/.claude/skills/using-git-worktrees/SKILL.md` | worktree-register.sh 呼び出し追加 |
| Modify | `~/.claude/skills/finishing-a-development-branch/SKILL.md` | worktree-set-pr.sh 呼び出し追加 |

---

## Task 1: worktree-health.sh を作成する

**Files:**
- Create: `C:/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-health.sh`

- [ ] **Step 1: scripts ディレクトリを作成する**

```bash
mkdir -p /c/tool/claude/ai-diagnosis-platform/.claude/scripts
```

- [ ] **Step 2: worktree-health.sh を作成する**

```bash
cat > /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-health.sh << 'SCRIPT'
#!/bin/bash
# Worktree Health Check
# 終了コード: 0=クリーン, 1=ABANDONED検出（作業ブロック）
set -euo pipefail

# どの worktree から実行しても メインプロジェクトルートを特定
MAIN_ROOT=$(dirname "$(git rev-parse --git-common-dir)")
cd "$MAIN_ROOT"

BASE_BRANCH="master"
ABANDONED_DAYS=3
HAS_CRITICAL=0

git fetch origin --quiet 2>/dev/null || true

echo "=== Worktree Health Check ==="

while IFS= read -r worktree_path; do
  # メインworktreeはスキップ
  [[ "$worktree_path" == "$MAIN_ROOT" ]] && continue
  # パスが存在しない場合はスキップ
  [[ ! -d "$worktree_path" ]] && continue

  branch=$(git -C "$worktree_path" branch --show-current 2>/dev/null || echo "DETACHED")
  name=$(basename "$worktree_path")

  # マージ判定はgitに委ねる（権威）。fetch済みの origin を参照
  if git branch --merged "origin/$BASE_BRANCH" 2>/dev/null | grep -q "  $branch$\|^* $branch$"; then
    echo "✅ MERGED    [$name] $branch → 自動削除"
    git worktree remove "$worktree_path" --force 2>/dev/null || true
    git branch -d "$branch" 2>/dev/null || true
    continue
  fi

  # PR確認（gh CLI がなければスキップ）
  pr=""
  if command -v gh &>/dev/null; then
    pr=$(gh pr list --head "$branch" --json number,state -q '.[0] | select(.state=="OPEN") | .number' 2>/dev/null || echo "")
  fi

  if [[ -n "$pr" ]]; then
    echo "🔵 PR_OPEN   [$name] $branch → PR #$pr"
    continue
  fi

  # 最終コミットからの経過日数
  last_commit_epoch=$(git -C "$worktree_path" log -1 --format=%ct 2>/dev/null || echo "0")
  now_epoch=$(date +%s)
  last_commit_days=$(( (now_epoch - last_commit_epoch) / 86400 ))

  if [[ $last_commit_days -ge $ABANDONED_DAYS ]]; then
    echo "🚨 ABANDONED [$name] $branch → ${last_commit_days}日間放置 PRなし 作業消失リスク"
    HAS_CRITICAL=1
  else
    echo "🟡 ACTIVE    [$name] $branch → ${last_commit_days}日目"
  fi

done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')

echo "=============================="

if [[ $HAS_CRITICAL -eq 1 ]]; then
  echo ""
  echo "🚨 ABANDONED worktree が存在します。マージまたは破棄を決定してから作業を開始してください。"
  exit 1
fi

exit 0
SCRIPT
chmod +x /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-health.sh
```

- [ ] **Step 3: スクリプトを手動実行して動作を確認する**

```bash
bash /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-health.sh
```

期待される出力例（現在の状況に応じて変わる）:
```
=== Worktree Health Check ===
✅ MERGED    [epic-taussig] claude/epic-taussig → 自動削除
🟡 ACTIVE    [vibrant-vaughan] claude/vibrant-vaughan → 0日目
==============================
```

終了コードが 0 であること（ABANDONED なし）を確認:
```bash
echo "Exit code: $?"
```

---

## Task 2: worktree-register.sh と worktree-set-pr.sh を作成する

**Files:**
- Create: `C:/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-register.sh`
- Create: `C:/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-set-pr.sh`

- [ ] **Step 1: worktree-register.sh を作成する**

```bash
cat > /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-register.sh << 'SCRIPT'
#!/bin/bash
# worktree 作成時に Registry へ登録
# 使用方法: bash worktree-register.sh <name> <branch> <purpose>
set -euo pipefail

NAME=${1:?Usage: worktree-register.sh <name> <branch> <purpose>}
BRANCH=${2:?}
PURPOSE=${3:?}

MAIN_ROOT=$(dirname "$(git rev-parse --git-common-dir)")
REGISTRY="$MAIN_ROOT/.claude/worktrees.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Registry が存在しない場合は初期化
if [[ ! -f "$REGISTRY" ]]; then
  echo '{"worktrees":{},"config":{"abandoned_threshold_days":3,"base_branch":"master"}}' > "$REGISTRY"
fi

jq --arg name "$NAME" \
   --arg branch "$BRANCH" \
   --arg purpose "$PURPOSE" \
   --arg ts "$TIMESTAMP" \
   '.worktrees[$name] = {branch: $branch, purpose: $purpose, created_at: $ts, pr_number: null, status: "ACTIVE"}' \
   "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"

echo "✅ Registry 登録: [$NAME] $PURPOSE"
SCRIPT
chmod +x /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-register.sh
```

- [ ] **Step 2: worktree-set-pr.sh を作成する**

```bash
cat > /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-set-pr.sh << 'SCRIPT'
#!/bin/bash
# PR 作成時に Registry を更新
# 使用方法: bash worktree-set-pr.sh <name> <pr_number>
set -euo pipefail

NAME=${1:?Usage: worktree-set-pr.sh <name> <pr_number>}
PR=${2:?}

MAIN_ROOT=$(dirname "$(git rev-parse --git-common-dir)")
REGISTRY="$MAIN_ROOT/.claude/worktrees.json"

if [[ ! -f "$REGISTRY" ]]; then
  echo "⚠️  Registry が見つかりません: $REGISTRY"
  exit 1
fi

jq --arg name "$NAME" \
   --argjson pr "$PR" \
   '.worktrees[$name].pr_number = $pr | .worktrees[$name].status = "PR_OPEN"' \
   "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"

echo "✅ Registry 更新: [$NAME] → PR #$PR"
SCRIPT
chmod +x /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-set-pr.sh
```

- [ ] **Step 3: register → set-pr の動作を確認する**

```bash
# テスト登録
bash /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-register.sh \
  "test-worktree" "claude/test-worktree" "動作確認用テスト"

# Registry 内容確認
cat /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json

# PR番号更新
bash /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-set-pr.sh \
  "test-worktree" 99

# 更新後確認
cat /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json
```

期待される出力（worktrees.json）:
```json
{
  "worktrees": {
    "test-worktree": {
      "branch": "claude/test-worktree",
      "purpose": "動作確認用テスト",
      "created_at": "2026-04-07T...",
      "pr_number": 99,
      "status": "PR_OPEN"
    }
  },
  "config": { "abandoned_threshold_days": 3, "base_branch": "master" }
}
```

- [ ] **Step 4: テストエントリを削除する**

```bash
jq 'del(.worktrees["test-worktree"])' \
  /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json \
  > /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json.tmp && \
  mv /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json.tmp \
     /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json
```

---

## Task 3: Registry を初期化する

**Files:**
- Create: `C:/tool/claude/ai-diagnosis-platform/.claude/worktrees.json`

- [ ] **Step 1: worktrees.json を初期化する**

```bash
cat > /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json << 'EOF'
{
  "worktrees": {},
  "config": {
    "abandoned_threshold_days": 3,
    "base_branch": "master"
  }
}
EOF
```

- [ ] **Step 2: jq で valid JSON であることを確認する**

```bash
jq . /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json
```

期待される出力:
```json
{
  "worktrees": {},
  "config": {
    "abandoned_threshold_days": 3,
    "base_branch": "master"
  }
}
```

---

## Task 4: PreToolUse Hook を settings.json に設定する

**Files:**
- Modify: `C:/tool/claude/ai-diagnosis-platform/.claude/settings.json`
- Modify: `C:/tool/claude/ai-diagnosis-platform/.claude/worktrees/vibrant-vaughan/.claude/settings.json`

- [ ] **Step 1: メインプロジェクトの settings.json に Hook を追加する**

現在の内容:
```json
{
  "allowedTools": [
    "Read(.claude/progress.md)",
    "Write(.claude/progress.md)",
    "Edit(.claude/progress.md)"
  ]
}
```

更新後の内容（jq でマージ）:
```bash
jq '. + {
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c '\''cd $(dirname $(git rev-parse --git-common-dir)) && bash .claude/scripts/worktree-health.sh'\''"
          }
        ]
      }
    ]
  }
}' /c/tool/claude/ai-diagnosis-platform/.claude/settings.json \
> /c/tool/claude/ai-diagnosis-platform/.claude/settings.json.tmp && \
mv /c/tool/claude/ai-diagnosis-platform/.claude/settings.json.tmp \
   /c/tool/claude/ai-diagnosis-platform/.claude/settings.json
```

- [ ] **Step 2: 更新内容を確認する**

```bash
cat /c/tool/claude/ai-diagnosis-platform/.claude/settings.json
```

期待される出力:
```json
{
  "allowedTools": [...],
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'cd $(dirname $(git rev-parse --git-common-dir)) && bash .claude/scripts/worktree-health.sh'"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: 現在の worktree (vibrant-vaughan) の settings.json にも同じ Hook を追加する**

```bash
jq '. + {
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c '\''cd $(dirname $(git rev-parse --git-common-dir)) && bash .claude/scripts/worktree-health.sh'\''"
          }
        ]
      }
    ]
  }
}' /c/tool/claude/ai-diagnosis-platform/.claude/worktrees/vibrant-vaughan/.claude/settings.json \
> /tmp/settings.tmp && \
mv /tmp/settings.tmp \
   /c/tool/claude/ai-diagnosis-platform/.claude/worktrees/vibrant-vaughan/.claude/settings.json
```

- [ ] **Step 4: Hook がトリガーされることを確認する**

Claude Code で Agent ツールを使う操作を試み、worktree-health.sh が実行されることをコンソールログで確認する（次セッション以降で自動検証）。

---

## Task 5: using-git-worktrees スキルに Registry 登録を追加する

**Files:**
- Modify: `~/.claude/skills/using-git-worktrees/SKILL.md`

- [ ] **Step 1: 現在のスキルの "Step 4: Verify Clean Baseline" を読む**

```bash
grep -n "Verify Clean Baseline\|Step 4\|Step 5\|Report Location" \
  /c/Users/temun/.claude/skills/using-git-worktrees/SKILL.md
```

- [ ] **Step 2: "Step 5: Report Location" の直前に Registry 登録ステップを追加する**

`/c/Users/temun/.claude/skills/using-git-worktrees/SKILL.md` の `### 5. Report Location` セクションを以下に置き換える:

```markdown
### 5. Register in Worktree Registry

```bash
bash "$(dirname $(git rev-parse --git-common-dir))/.claude/scripts/worktree-register.sh" \
  "$BRANCH_NAME" "$BRANCH_NAME" "$PURPOSE"
```

`$PURPOSE` には実装タスクの概要を1行で記載する（例: "P5ピラーページ実装"）。Registry ファイルが存在しない場合は自動初期化される。

### 6. Report Location
```

- [ ] **Step 3: 追加後の該当箇所を確認する**

```bash
grep -A5 "Register in Worktree Registry" \
  /c/Users/temun/.claude/skills/using-git-worktrees/SKILL.md
```

---

## Task 6: finishing-a-development-branch スキルに Registry 更新を追加する

**Files:**
- Modify: `~/.claude/skills/finishing-a-development-branch/SKILL.md`

- [ ] **Step 1: Option 2 の PR 作成コマンドを確認する**

```bash
grep -n "gh pr create\|worktree-set-pr\|Option 2" \
  /c/Users/temun/.claude/skills/finishing-a-development-branch/SKILL.md
```

- [ ] **Step 2: `gh pr create` の直後に Registry 更新を追加する**

`gh pr create ...` コマンドブロックの後に以下を追加する:

```markdown
# Registry を更新（PR番号を記録）
PR_NUMBER=$(gh pr view --json number -q .number)
WORKTREE_NAME=$(basename "$(git rev-parse --show-toplevel)")
bash "$(dirname $(git rev-parse --git-common-dir))/.claude/scripts/worktree-set-pr.sh" \
  "$WORKTREE_NAME" "$PR_NUMBER"
```

- [ ] **Step 3: 追加後の該当箇所を確認する**

```bash
grep -A5 "worktree-set-pr" \
  /c/Users/temun/.claude/skills/finishing-a-development-branch/SKILL.md
```

---

## Task 7: 既存 worktree の初回クリーンアップと E2E 確認

- [ ] **Step 1: Health Check を実行して現状をスキャンする**

```bash
bash /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-health.sh
```

期待される動作:
- `epic-taussig`, `keen-cray`, `nice-bhaskara`, `quizzical-goldwasser`, `relaxed-lewin`, `stoic-bassi`, `xenodochial-colden` → `✅ MERGED` → 自動削除
- `vibrant-vaughan` → `🟡 ACTIVE` → 残存

- [ ] **Step 2: worktree list でクリーンアップ結果を確認する**

```bash
git -C /c/tool/claude/ai-diagnosis-platform worktree list
```

期待される出力:
```
C:/tool/claude/ai-diagnosis-platform                         6ad4420 [master]
C:/tool/claude/ai-diagnosis-platform/.claude/worktrees/vibrant-vaughan  ... [claude/vibrant-vaughan]
```

- [ ] **Step 3: ローカルブランチが削除されていることを確認する**

```bash
git -C /c/tool/claude/ai-diagnosis-platform branch
```

期待される出力:
```
  claude/vibrant-vaughan
* master
```

- [ ] **Step 4: vibrant-vaughan を現在のセッションの Registry に登録する**

```bash
bash /c/tool/claude/ai-diagnosis-platform/.claude/scripts/worktree-register.sh \
  "vibrant-vaughan" "claude/vibrant-vaughan" "worktree構成管理システム実装"
```

- [ ] **Step 5: Registry の最終状態を確認する**

```bash
cat /c/tool/claude/ai-diagnosis-platform/.claude/worktrees.json
```

期待される出力:
```json
{
  "worktrees": {
    "vibrant-vaughan": {
      "branch": "claude/vibrant-vaughan",
      "purpose": "worktree構成管理システム実装",
      "created_at": "2026-04-07T...",
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

## 完了チェックリスト

| 項目 | 確認方法 |
|------|---------|
| `worktree-health.sh` が正常終了する | `bash worktree-health.sh; echo $?` → `0` |
| MERGED worktree が自動削除される | Health Check 実行後に `git worktree list` で確認 |
| `worktree-register.sh` が Registry に書き込む | 実行後に `cat worktrees.json` で確認 |
| `worktree-set-pr.sh` が PR 番号を更新する | 実行後に `cat worktrees.json` で確認 |
| Hook が settings.json に設定されている | `cat .claude/settings.json` で hooks キーを確認 |
| `using-git-worktrees` スキルに登録ステップがある | `grep "worktree-register" SKILL.md` |
| `finishing-a-development-branch` スキルに更新ステップがある | `grep "worktree-set-pr" SKILL.md` |
