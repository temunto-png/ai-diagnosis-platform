import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CalendarEntry, ArticleMetadata } from "../scripts/types.js";

// Mock @anthropic-ai/sdk - the factory must expose the mockCreate fn
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

describe("generatePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Claude and returns parsed JSON for X-only post", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"x": "DIYで壁紙補修 #賃貸DIY #壁紙補修"}' }],
    });

    const { generatePost } = await import("../scripts/generate-post.js");
    const entry: CalendarEntry = {
      date: "2026-04-09",
      platforms: ["x"],
      type: "tips",
      slug: "wallpaper-repair",
    };
    const article: ArticleMetadata = {
      title: "壁紙補修の方法",
      description: "壁紙の補修方法を解説",
      category: "壁紙・クロス",
    };

    const result = await generatePost(entry, article);
    expect(result.x).toBe("DIYで壁紙補修 #賃貸DIY #壁紙補修");
    expect(result.instagram).toBeUndefined();
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("extracts JSON even when surrounded by text", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: 'こちらです：{"x": "テスト投稿 #DIY"}' }],
    });

    const { generatePost } = await import("../scripts/generate-post.js");
    const entry: CalendarEntry = {
      date: "2026-04-11",
      platforms: ["x"],
      type: "rental-aru-aru",
      slug: null,
    };
    const result = await generatePost(entry, null);
    expect(result.x).toBe("テスト投稿 #DIY");
  });

  it("throws when Claude returns no JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "JSONなしのレスポンス" }],
    });

    const { generatePost } = await import("../scripts/generate-post.js");
    const entry: CalendarEntry = {
      date: "2026-04-11",
      platforms: ["x"],
      type: "rental-aru-aru",
      slug: null,
    };
    await expect(generatePost(entry, null)).rejects.toThrow("Claude returned no JSON");
  });
});
