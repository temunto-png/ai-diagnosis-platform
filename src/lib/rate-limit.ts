interface RateLimiterStub {
  fetch(request: Request): Promise<Response>;
}

interface RateLimiterNamespace {
  getByName(name: string): RateLimiterStub;
}

const counts = new Map<string, { count: number }>();

function buildRateLimitKey(ip: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `rate:${ip}:${today}`;
}

export async function isRateLimited(
  ip: string,
  limit: number,
  namespace?: RateLimiterNamespace | null
): Promise<boolean> {
  const key = buildRateLimitKey(ip);

  if (namespace) {
    const stub = namespace.getByName(key);
    const response = await stub.fetch(
      new Request("https://internal-rate-limiter/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
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
