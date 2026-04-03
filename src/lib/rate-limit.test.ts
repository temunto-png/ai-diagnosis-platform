import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildRateLimitKey, clearCountsForTest, isRateLimited, msUntilNextReset } from "./rate-limit";

describe("isRateLimited", () => {
  beforeEach(() => clearCountsForTest());
  afterEach(() => vi.useRealTimers());

  it("allows the first request", async () => {
    expect(await isRateLimited("1.2.3.4", 5)).toBe(false);
  });

  it("allows requests up to the limit", async () => {
    for (let index = 0; index < 5; index++) {
      expect(await isRateLimited("1.2.3.4", 5)).toBe(false);
    }
  });

  it("blocks when the limit is exceeded", async () => {
    for (let index = 0; index < 5; index++) {
      await isRateLimited("1.2.3.4", 5);
    }

    expect(await isRateLimited("1.2.3.4", 5)).toBe(true);
  });

  it("tracks different IPs separately", async () => {
    for (let index = 0; index < 5; index++) {
      await isRateLimited("1.2.3.4", 5);
    }

    expect(await isRateLimited("5.6.7.8", 5)).toBe(false);
  });

  it("uses the local date boundary for the cache key", () => {
    const beforeMidnightUtc = new Date("2026-04-03T14:59:59Z");
    const afterMidnightUtc = new Date("2026-04-03T15:00:00Z");

    expect(buildRateLimitKey("1.2.3.4", beforeMidnightUtc)).toContain("2026-04-03");
    expect(buildRateLimitKey("1.2.3.4", afterMidnightUtc)).toContain("2026-04-04");
  });

  it("computes reset timing until the next local midnight", () => {
    const now = new Date("2026-04-03T14:30:00Z");
    expect(msUntilNextReset(now)).toBe(30 * 60 * 1000);
  });

  it("uses the durable object namespace when provided", async () => {
    const requests: Array<{ key: string; limit: number; resetAfterMs: number }> = [];
    const namespace = {
      getByName(name: string) {
        return {
          async fetch(request: Request) {
            const body = (await request.json()) as { limit: number; resetAfterMs: number };
            requests.push({ key: name, limit: body.limit, resetAfterMs: body.resetAfterMs });
            return Response.json({ limited: false });
          },
        };
      },
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T14:30:00Z"));

    expect(await isRateLimited("9.9.9.9", 5, namespace)).toBe(false);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.key).toContain("2026-04-03");
    expect(requests[0]?.limit).toBe(5);
    expect(requests[0]?.resetAfterMs).toBe(30 * 60 * 1000);
  });

  it("throws when the durable object request fails", async () => {
    const namespace = {
      getByName() {
        return {
          async fetch() {
            return new Response(null, { status: 503 });
          },
        };
      },
    };

    await expect(isRateLimited("9.9.9.9", 5, namespace)).rejects.toThrow(
      "Rate limiter durable object error: 503"
    );
  });
});
