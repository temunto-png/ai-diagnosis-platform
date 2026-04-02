import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTweet = vi.fn();
vi.mock("twitter-api-v2", () => ({
  TwitterApi: vi.fn().mockImplementation(() => ({
    v2: { tweet: mockTweet },
  })),
}));

describe("postToX", () => {
  beforeEach(() => {
    process.env["X_API_KEY"] = "key";
    process.env["X_API_SECRET"] = "secret";
    process.env["X_ACCESS_TOKEN"] = "token";
    process.env["X_ACCESS_SECRET"] = "access_secret";
    vi.clearAllMocks();
  });

  it("calls v2.tweet and returns tweet id", async () => {
    mockTweet.mockResolvedValueOnce({ data: { id: "1234567890" } });

    const { postToX } = await import("../scripts/post-x.js");
    const id = await postToX("テスト投稿 #DIY");
    expect(id).toBe("1234567890");
    expect(mockTweet).toHaveBeenCalledWith("テスト投稿 #DIY");
  });

  it("propagates twitter-api-v2 errors", async () => {
    mockTweet.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    const { postToX } = await import("../scripts/post-x.js");
    await expect(postToX("テスト")).rejects.toThrow("Rate limit exceeded");
  });
});
