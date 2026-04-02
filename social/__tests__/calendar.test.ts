import { describe, it, expect } from "vitest";
import { findTodayEntry, parseCalendar } from "../scripts/calendar.js";
import type { ContentCalendar } from "../scripts/types.js";

const SAMPLE_YAML = `
posts:
  - date: "2026-04-07"
    platforms: [x, instagram]
    type: article-promo
    slug: drain-clog-removal
  - date: "2026-04-09"
    platforms: [x]
    type: tips
    slug: wallpaper-repair
  - date: "2026-04-11"
    platforms: [x]
    type: rental-aru-aru
    slug: null
`;

describe("parseCalendar", () => {
  it("parses YAML into ContentCalendar", () => {
    const cal = parseCalendar(SAMPLE_YAML);
    expect(cal.posts).toHaveLength(3);
    expect(cal.posts[0]).toEqual({
      date: "2026-04-07",
      platforms: ["x", "instagram"],
      type: "article-promo",
      slug: "drain-clog-removal",
    });
  });

  it("handles slug: null", () => {
    const cal = parseCalendar(SAMPLE_YAML);
    expect(cal.posts[2].slug).toBeNull();
  });
});

describe("findTodayEntry", () => {
  const calendar: ContentCalendar = {
    posts: [
      { date: "2026-04-07", platforms: ["x", "instagram"], type: "article-promo", slug: "drain-clog-removal" },
      { date: "2026-04-09", platforms: ["x"], type: "tips", slug: "wallpaper-repair" },
    ],
  };

  it("returns matching entry for today", () => {
    expect(findTodayEntry(calendar, "2026-04-07")).toEqual(calendar.posts[0]);
  });

  it("returns null when no entry matches", () => {
    expect(findTodayEntry(calendar, "2026-04-08")).toBeNull();
  });
});
