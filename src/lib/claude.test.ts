import { describe, it, expect, vi, beforeEach } from "vitest";
import { callClaude } from "./claude";

describe("callClaude", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls Claude API and returns parsed JSON from text content", async () => {
    const mockResponse = {
      content: [{ type: "text", text: '{"damage_type":"キズ","damage_level":"軽度"}' }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })
    );

    const result = await callClaude("test-key", "base64img", "診断してください");
    expect(result).toEqual({ damage_type: "キズ", damage_level: "軽度" });
  });

  it("uses Haiku model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callClaude("test-key", "base64img", "診断してください");

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

    await callClaude("test-key", "base64img", "診断してください");

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["anthropic-beta"]).toContain("prompt-caching");
  });

  it("throws when Claude returns a non-JSON text response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: "text", text: "これはJSONではありません" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(callClaude("test-key", "base64data", "診断してください")).rejects.toThrow(
      "Claude returned non-JSON response"
    );
  });

  it("throws meaningful error when Claude API returns non-JSON error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => "text/html" },
        text: async () => "<html>Internal Server Error</html>",
        json: async () => {
          throw new SyntaxError("Unexpected end of JSON input");
        },
      })
    );

    await expect(callClaude("test-key", "base64img", "診断してください")).rejects.toThrow(
      "Claude API error: 500"
    );
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

    const result = await callClaude("test-key", "base64img", "診断してください");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10000);
});
