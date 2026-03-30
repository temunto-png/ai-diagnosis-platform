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
});
