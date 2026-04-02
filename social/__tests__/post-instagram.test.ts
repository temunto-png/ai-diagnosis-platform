import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("postToInstagram", () => {
  beforeEach(() => {
    process.env["INSTAGRAM_USER_ID"] = "123456789";
    process.env["INSTAGRAM_ACCESS_TOKEN"] = "test_token";
    vi.clearAllMocks();
  });

  it("fetches OG image, creates container, and publishes", async () => {
    // 1. OGP fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<meta property="og:image" content="https://satsu-tei.com/og.png"/>',
    });
    // 2. /media (create container)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "container_001" }),
    });
    // 3. /media_publish
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "post_001" }),
    });

    const { postToInstagram } = await import("../scripts/post-instagram.js");
    const postId = await postToInstagram(
      "テストキャプション",
      "https://satsu-tei.com/guide/drain-clog-removal/"
    );
    expect(postId).toBe("post_001");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws when OG image is not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body>no og image</body></html>",
    });

    const { postToInstagram } = await import("../scripts/post-instagram.js");
    await expect(
      postToInstagram(
        "キャプション",
        "https://satsu-tei.com/guide/drain-clog-removal/"
      )
    ).rejects.toThrow("No OG image found");
  });

  it("throws when media create fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<meta property="og:image" content="https://satsu-tei.com/og.png"/>',
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => "Bad Request",
    });

    const { postToInstagram } = await import("../scripts/post-instagram.js");
    await expect(
      postToInstagram(
        "キャプション",
        "https://satsu-tei.com/guide/drain-clog-removal/"
      )
    ).rejects.toThrow("Instagram media create failed");
  });
});
