import { describe, it, expect, beforeEach } from "vitest";
import { isRateLimited, clearCountsForTest } from "./rate-limit";

describe("isRateLimited", () => {
  beforeEach(() => clearCountsForTest());

  it("allows first request", async () => {
    expect(await isRateLimited("1.2.3.4", 5)).toBe(false);
  });

  it("allows up to limit", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await isRateLimited("1.2.3.4", 5)).toBe(false);
    }
  });

  it("blocks when limit exceeded", async () => {
    for (let i = 0; i < 5; i++) {
      await isRateLimited("1.2.3.4", 5);
    }
    expect(await isRateLimited("1.2.3.4", 5)).toBe(true);
  });

  it("different IPs are tracked separately", async () => {
    for (let i = 0; i < 5; i++) {
      await isRateLimited("1.2.3.4", 5);
    }
    expect(await isRateLimited("5.6.7.8", 5)).toBe(false);
  });

  it("uses durable object namespace when provided", async () => {
    const requests: Array<{ key: string; limit: number }> = [];
    const namespace = {
      getByName(name: string) {
        return {
          async fetch(request: Request) {
            const body = (await request.json()) as { limit: number };
            requests.push({ key: name, limit: body.limit });
            return Response.json({ limited: body.limit <= 1 });
          },
        };
      },
    };

    expect(await isRateLimited("9.9.9.9", 5, namespace)).toBe(false);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.key).toContain("9.9.9.9");
    expect(requests[0]?.limit).toBe(5);
  });

  it("throws when durable object request fails", async () => {
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
