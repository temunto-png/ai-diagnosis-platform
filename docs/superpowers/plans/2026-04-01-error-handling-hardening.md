# Error Handling Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 診断APIで発生する「Unexpected end of JSON input」エラーおよび同パターンの潜在バグ5件を根絶し、エラーハンドリングを全レイヤーで堅牢化する。

**Architecture:** サーバー側（`analyze.ts`）はすべての例外をJSON形式で返すよう外側try/catchで包む。クライアント側（`ImageUploader.tsx`）はエラーレスポンスをcontent-typeで判定してからパースする。`claude.ts`はAnthropicからの非JSONエラーに対しても安全にスローする。

**Tech Stack:** Astro 6.1.1 + React 19 + TypeScript + Cloudflare Workers + Vitest

---

## 背景・発見された問題

| ID | 場所 | デプロイ済み? | 問題 |
|----|------|-------------|------|
| B1 | `ImageUploader.tsx` L53 | ✅ deployed | `!res.ok` 時にcontent-typeチェックなしで `res.json()` → 非JSON返却時に `Unexpected end of JSON input` |
| B2 | `analyze.ts` | ✅ deployed | `isRateLimited()` がtry/catch未包囲 → KV失敗時に未ハンドル例外 → 非JSON 500 |
| B3 | `analyze.ts` | ✅ deployed | `(locals as App.Locals).runtime.env`（nullチェックなし） → runtime未定義時TypeError |
| B4 | `claude.ts` L49 | 両方 | Claude APIが非JSONエラーを返した際に `response.json()` がクラッシュ |
| B5 | `ImageUploader.tsx` L39 | 両方 | sessionStorage キャッシュの `JSON.parse(cached)` にtry/catchなし → 破損時クラッシュ |

**現在の作業ツリー状態（masterブランチ）:**
- `src/components/ImageUploader.tsx`: staged（B1修正済み）
- `src/pages/api/[appId]/analyze.ts`: unstaged（B2・B3修正済み）
- `feature/bundle-reduction-and-bugfix`: 5コミット先行（emptyOutDir, prerender, monetization修正, claude.ts JSON.parse修正, ObjectURL修正）

---

## ファイルマップ

| ファイル | 変更内容 |
|---------|---------|
| `src/pages/api/[appId]/analyze.ts` | Commit既存修正（B2・B3） |
| `src/components/ImageUploader.tsx` | Commit既存修正（B1）+ B5追加修正 + マージ競合解消 |
| `src/lib/claude.ts` | B4修正（featureブランチ版をベースに補強）+ マージで取込 |
| `src/lib/claude.test.ts` | 非JSONエラーレスポンスのテスト追加 |

---

## Task 1: 作業ツリーの修正をコミット（B1・B2・B3）

**Files:**
- Modify: `src/components/ImageUploader.tsx`（staged）
- Modify: `src/pages/api/[appId]/analyze.ts`（unstaged）

- [ ] **Step 1: 型チェック実行**

```bash
npm run typecheck
```
Expected: エラー 0件

- [ ] **Step 2: テスト実行**

```bash
npm test
```
Expected: 全テスト PASS（現在18件）

- [ ] **Step 3: analyze.ts をステージ**

```bash
git add src/pages/api/\[appId\]/analyze.ts
```

- [ ] **Step 4: コミット**

```bash
git commit -m "fix: harden error handling in analyze.ts and ImageUploader fetch"
```

---

## Task 2: feature ブランチを master にマージ

**注意:** `ImageUploader.tsx` で競合が発生する。両方の変更（ObjectURL fix + content-type check）を保持すること。

- [ ] **Step 1: マージ実行**

```bash
git merge feature/bundle-reduction-and-bugfix
```

Expected: `CONFLICT (content): Merge conflict in src/components/ImageUploader.tsx` が出る

- [ ] **Step 2: 競合内容を確認**

```bash
git diff --diff-filter=U
```

- [ ] **Step 3: ImageUploader.tsx の競合を解消**

解消後の `getOrFetch` 関数は以下の形になるよう手動編集する：

```tsx
async function getOrFetch(
  file: File,
  appId: string,
  context: Record<string, string>
): Promise<Record<string, unknown>> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hash = btoa(String.fromCharCode(...new Uint8Array(buf))).slice(0, 16);
  const cacheKey = `result:${appId}:${hash}`;

  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, ts } = JSON.parse(cached) as { data: Record<string, unknown>; ts: number };
    if (Date.now() - ts < 5 * 60 * 1000) return data;
  }

  const image = await resizeImage(file);
  const res = await fetch(`/api/${appId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, context }),
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const err = (await res.json()) as { error: string };
      throw new Error(err.error ?? "診断に失敗しました");
    }
    throw new Error(`診断サービスに接続できませんでした (${res.status})`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  return data;
}
```

また `resizeImage` 関数はfeatureブランチ版（nullチェックあり）を維持：

```tsx
async function resizeImage(file: File): Promise<string> {
  const MAX = 800;
  const img = await createImageBitmap(file);
  const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}
```

`useEffect` によるObjectURL revoke（featureブランチ版）も維持：

```tsx
useEffect(() => {
  return () => {
    if (preview) URL.revokeObjectURL(preview);
  };
}, [preview]);
```

- [ ] **Step 4: マージをステージしてコミット**

```bash
git add src/components/ImageUploader.tsx
git commit -m "Merge feature/bundle-reduction-and-bugfix into master"
```

- [ ] **Step 5: 型チェック・テスト実行**

```bash
npm run typecheck && npm test
```

Expected: 全件 PASS

---

## Task 3: B5 修正 — sessionStorage JSON.parse を安全化

**Files:**
- Modify: `src/components/ImageUploader.tsx`

- [ ] **Step 1: 失敗テストを書く（vitest/jsdomがないのでコード変更のみ、動作確認はStep 4のビルドで行う）**

`getOrFetch` の sessionStorage ブロックを以下に置き換える（`src/components/ImageUploader.tsx`）：

```tsx
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached) as { data: Record<string, unknown>; ts: number };
      if (Date.now() - ts < 5 * 60 * 1000) return data;
    } catch {
      sessionStorage.removeItem(cacheKey);
    }
  }
```

- [ ] **Step 2: 型チェック**

```bash
npm run typecheck
```

Expected: エラー 0件

- [ ] **Step 3: コミット**

```bash
git add src/components/ImageUploader.tsx
git commit -m "fix: guard sessionStorage JSON.parse against corrupted cache (B5)"
```

---

## Task 4: B4 修正 — claude.ts の非JSONエラーレスポンス安全化

**Files:**
- Modify: `src/lib/claude.ts`
- Test: `src/lib/claude.test.ts`

- [ ] **Step 1: 失敗テストを書く**

`src/lib/claude.test.ts` に以下のテストケースを追加：

```ts
it("throws meaningful error when Claude API returns non-JSON error response", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => "text/html" },
      text: async () => "<html>Internal Server Error</html>",
      json: async () => { throw new SyntaxError("Unexpected end of JSON input"); },
    })
  );

  await expect(callClaude("test-key", "base64img", "診断して")).rejects.toThrow(
    "Claude API error: 500"
  );
});
```

- [ ] **Step 2: テスト実行（失敗を確認）**

```bash
npm test -- --reporter=verbose src/lib/claude.test.ts
```

Expected: FAIL（現在の `response.json()` がSyntaxErrorをスローしてそのまま伝播する）

- [ ] **Step 3: claude.ts の非OKレスポンス処理を修正**

`src/lib/claude.ts` の `if (!response.ok)` ブロックを以下に置き換える：

```ts
    if (!response.ok) {
      let message = `Claude API error: ${response.status}`;
      try {
        const err = await response.json() as { error?: { message?: string } };
        message = err.error?.message ?? message;
      } catch {
        // non-JSON error response（HTMLエラーページ等）は無視してデフォルトメッセージを使用
      }
      throw new Error(message);
    }
```

- [ ] **Step 4: テスト実行（成功を確認）**

```bash
npm test -- --reporter=verbose src/lib/claude.test.ts
```

Expected: 全5テスト PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/claude.ts src/lib/claude.test.ts
git commit -m "fix: handle non-JSON error responses from Claude API gracefully (B4)"
```

---

## Task 5: 全テスト・型チェック・ビルド検証

**Files:** なし（検証のみ）

- [ ] **Step 1: 型チェック**

```bash
npm run typecheck
```

Expected: エラー 0件

- [ ] **Step 2: 全テスト実行**

```bash
npm test
```

Expected: 19件以上 PASS（Task 4で1件追加）

- [ ] **Step 3: ビルド**

```bash
npm run build
```

Expected: エラーなし、`dist/server/` のサイズが ~1.1MB 前後

- [ ] **Step 4: バンドルサイズ確認**

```bash
du -sh dist/server/
```

Expected: 2MB 以下

---

## Task 6: 本番デプロイ

- [ ] **Step 1: デプロイ実行**

```bash
npx wrangler deploy --config dist/server/wrangler.json
```

Expected: `Deployed satsu-tei` + バージョンUUID が出力される

- [ ] **Step 2: 本番での動作確認**

`https://satsu-tei.com` で診断ツールを開き、画像をアップロードして診断が正常に返ることを確認。

- [ ] **Step 3: progress.md を更新**

`docs` ではなく `.claude/progress.md` の「次セッションでやること」セクションを更新し、本タスクの完了を記録する。

---

## セルフレビュー

### スペックカバレッジ
- B1: Task 2（マージ競合解消でfeatureブランチの修正+content-type check両方維持）✅
- B2: Task 1（analyze.ts コミット）✅
- B3: Task 1（analyze.ts コミット）✅
- B4: Task 4 ✅
- B5: Task 3 ✅
- テスト: Task 4 ✅
- デプロイ: Task 6 ✅

### プレースホルダースキャン
- 全ステップにコードあり ✅
- 全コマンドにExpected出力あり ✅

### 型整合性
- `callClaude` シグネチャ変更なし ✅
- `getOrFetch` の返り値型変更なし ✅
