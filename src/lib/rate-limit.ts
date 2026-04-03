interface RateLimiterStub {
  fetch(request: Request): Promise<Response>;
}

interface RateLimiterNamespace {
  getByName(name: string): RateLimiterStub;
}

const LOCAL_UTC_OFFSET_MINUTES = 9 * 60;
const counts = new Map<string, { count: number }>();

function toLocalTime(date: Date): Date {
  return new Date(date.getTime() + LOCAL_UTC_OFFSET_MINUTES * 60 * 1000);
}

export function buildRateLimitKey(ip: string, now = new Date()): string {
  const localNow = toLocalTime(now);
  const yyyy = localNow.getUTCFullYear();
  const mm = String(localNow.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(localNow.getUTCDate()).padStart(2, "0");
  return `rate:${ip}:${yyyy}-${mm}-${dd}`;
}

export function msUntilNextReset(now = new Date()): number {
  const localNow = toLocalTime(now);
  const nextLocalMidnight = new Date(localNow);
  nextLocalMidnight.setUTCHours(24, 0, 0, 0);
  return Math.max(1_000, nextLocalMidnight.getTime() - localNow.getTime());
}

export async function isRateLimited(
  ip: string,
  limit: number,
  namespace?: RateLimiterNamespace | null
): Promise<boolean> {
  const now = new Date();
  const key = buildRateLimitKey(ip, now);

  if (namespace) {
    const stub = namespace.getByName(key);
    const response = await stub.fetch(
      new Request("https://internal-rate-limiter/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, resetAfterMs: msUntilNextReset(now) }),
      })
    );

    if (!response.ok) {
      throw new Error(`Rate limiter durable object error: ${response.status}`);
    }

    const data = (await response.json()) as { limited?: boolean };
    return data.limited === true;
  }

  const entry = counts.get(key);
  if (!entry) {
    counts.set(key, { count: 1 });
    return false;
  }

  if (entry.count >= limit) return true;

  entry.count++;
  return false;
}

export function clearCountsForTest(): void {
  counts.clear();
}
