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

/** テスト専用：カウンターをリセット */
export function clearCountsForTest(): void {
  counts.clear();
}
