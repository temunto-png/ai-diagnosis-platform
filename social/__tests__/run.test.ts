import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CalendarEntry, ContentCalendar } from "../scripts/types.js";

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

vi.mock("../scripts/calendar.js", () => ({
  loadCalendar: vi.fn(),
  findTodayEntry: vi.fn(),
}));
vi.mock("../scripts/read-article.js", () => ({
  readArticleMetadata: vi.fn(),
}));
vi.mock("../scripts/generate-post.js", () => ({
  generatePost: vi.fn(),
}));
vi.mock("../scripts/post-x.js", () => ({
  postToX: vi.fn(),
}));
vi.mock("../scripts/post-instagram.js", () => ({
  postToInstagram: vi.fn(),
}));

import { loadCalendar, findTodayEntry } from "../scripts/calendar.js";
import { readArticleMetadata } from "../scripts/read-article.js";
import { generatePost } from "../scripts/generate-post.js";
import { postToX } from "../scripts/post-x.js";
import { postToInstagram } from "../scripts/post-instagram.js";

const mockLoadCalendar = vi.mocked(loadCalendar);
const mockFindTodayEntry = vi.mocked(findTodayEntry);
const mockReadArticle = vi.mocked(readArticleMetadata);
const mockGeneratePost = vi.mocked(generatePost);
const mockPostX = vi.mocked(postToX);
const mockPostInstagram = vi.mocked(postToInstagram);

describe("main", () => {
  const mockCalendar: ContentCalendar = { posts: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadCalendar.mockReturnValue(mockCalendar);
    mockReadArticle.mockReturnValue({
      title: "壁紙補修の方法",
      description: "壁紙の補修",
      category: "壁紙・クロス",
    });
  });

  it("exits silently when no entry scheduled", async () => {
    mockFindTodayEntry.mockReturnValue(null);
    const { main } = await import("../scripts/run.js");
    await expect(main("2026-04-08")).resolves.toBeUndefined();
    expect(mockGeneratePost).not.toHaveBeenCalled();
  });

  it("posts to X only when platforms is [x]", async () => {
    const entryX: CalendarEntry = {
      date: "2026-04-09",
      platforms: ["x"],
      type: "tips",
      slug: "wallpaper-repair",
    };
    mockFindTodayEntry.mockReturnValue(entryX);
    mockGeneratePost.mockResolvedValue({ x: "DIYで壁紙補修 {{url}} #DIY" });
    mockPostX.mockResolvedValue("tweet_001");

    const { main } = await import("../scripts/run.js");
    await main("2026-04-09");

    expect(mockPostX).toHaveBeenCalledWith(
      "DIYで壁紙補修 https://satsu-tei.com/guide/wallpaper-repair/?utm_source=x&utm_medium=social&utm_campaign=tips&utm_content=wallpaper-repair #DIY",
      undefined
    );
    expect(mockPostInstagram).not.toHaveBeenCalled();
  });

  it("posts to both X and Instagram with platform-specific UTM URLs", async () => {
    const entryBoth: CalendarEntry = {
      date: "2026-04-07",
      platforms: ["x", "instagram"],
      type: "article-promo",
      slug: "drain-clog-removal",
    };
    mockFindTodayEntry.mockReturnValue(entryBoth);
    mockGeneratePost.mockResolvedValue({
      x: "記事紹介 {{url}} #DIY",
      instagram: "記事紹介キャプション #賃貸DIY",
    });
    mockPostX.mockResolvedValue("tweet_002");
    mockPostInstagram.mockResolvedValue("ig_post_001");

    const { main } = await import("../scripts/run.js");
    await main("2026-04-07");

    expect(mockPostX).toHaveBeenCalledWith(
      "記事紹介 https://satsu-tei.com/guide/drain-clog-removal/?utm_source=x&utm_medium=social&utm_campaign=article-promo&utm_content=drain-clog-removal #DIY",
      undefined
    );
    expect(mockPostInstagram).toHaveBeenCalledWith(
      "記事紹介キャプション #賃貸DIY",
      "https://satsu-tei.com/guide/drain-clog-removal/?utm_source=instagram&utm_medium=social&utm_campaign=article-promo&utm_content=drain-clog-removal"
    );
  });

  it("skips article read when slug is null and uses freeform UTM content", async () => {
    const entryNoSlug: CalendarEntry = {
      date: "2026-04-11",
      platforms: ["x"],
      type: "rental-aru-aru",
      slug: null,
    };
    mockFindTodayEntry.mockReturnValue(entryNoSlug);
    mockGeneratePost.mockResolvedValue({ x: "賃貸あるある {{url}} #賃貸" });
    mockPostX.mockResolvedValue("tweet_003");

    const { main } = await import("../scripts/run.js");
    await main("2026-04-11");

    expect(mockReadArticle).not.toHaveBeenCalled();
    expect(mockGeneratePost).toHaveBeenCalledWith(entryNoSlug, null);
    expect(mockPostX).toHaveBeenCalledWith(
      "賃貸あるある https://satsu-tei.com?utm_source=x&utm_medium=social&utm_campaign=rental-aru-aru&utm_content=freeform #賃貸",
      undefined
    );
  });
});
