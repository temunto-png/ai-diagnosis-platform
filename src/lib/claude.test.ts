import { describe, it, expect, vi, beforeEach } from "vitest";
import { callClaude } from "./claude";

describe("callClaude", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls Claude API and returns parsed JSON from text content", async () => {
    const mockResponse = {
      content: [{ type: "text", text: '{"damage_type": "壁紙破れ", "damage_level": "軽微"}' }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })
    );

    const result = await callClaude("test-key", "base64img", "診断して");
    expect(result).toEqual({ damage_type: "壁紙破れ", damage_level: "軽微" });
  });

  it("uses Haiku model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callClaude("test-key", "base64img", "診断して");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("claude-haiku-4-5-20251001");
  });

  it("sends prompt-caching header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callClaude("test-key", "base64img", "診断して");

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["anthropic-beta"]).toContain("prompt-caching");
  });

  it("retries on 529 and eventually succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 529, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: "text", text: '{"ok": true}' }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callClaude("test-key", "base64img", "診断して");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10000);
});
