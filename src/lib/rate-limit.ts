interface RateLimitKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const counts = new Map<string, { count: number }>();

const KV_TTL_SECONDS = 25 * 60 * 60; // 25時間（日付変わり際のバッファ）

export async function isRateLimited(
  ip: string,
  limit: number,
  kv?: RateLimitKV | null
): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `rate:${ip}:${today}`;

  if (kv) {
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= limit) return true;
    await kv.put(key, String(count + 1), { expirationTtl: KV_TTL_SECONDS });
    return false;
  }

  // in-memory fallback（ローカル開発・テスト用）
  const entry = counts.get(key);
  if (!entry) {
    counts.set(key, { count: 1 });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}

/** テスト専用：カウンターをリセット */
export function clearCountsForTest(): void {
  counts.clear();
}
