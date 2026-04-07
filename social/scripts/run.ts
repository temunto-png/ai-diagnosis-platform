import { join, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { loadCalendar, findTodayEntry } from "./calendar.js";
import { readArticleMetadata } from "./read-article.js";
import { generatePost } from "./generate-post.js";
import { postToX } from "./post-x.js";
import { postToInstagram } from "./post-instagram.js";
import type { Platform, CalendarEntry } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CALENDAR_PATH = join(__dirname, "../content-calendar.yml");
const CONTENT_DIR = join(__dirname, "../../src/content/guide");
const IMAGES_DIR = join(__dirname, "../images");
const SITE_BASE = "https://satsu-tei.com";

/** 月から季節文字列を返す */
function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/** スラッグ・タイプから対応する画像パスを解決する。画像がなければ undefined */
function resolveImagePath(entry: CalendarEntry, today: string): string | undefined {
  // 1. スラッグ固有画像
  if (entry.slug) {
    const slugImage = join(IMAGES_DIR, `${entry.slug}.png`);
    if (existsSync(slugImage)) return slugImage;
  }
  // 2. seasonal タイプは月から季節を判定
  if (entry.type === "seasonal") {
    const month = new Date(today).getMonth() + 1;
    const seasonImage = join(IMAGES_DIR, `seasonal-${getSeason(month)}.png`);
    if (existsSync(seasonImage)) return seasonImage;
  }
  // 3. 投稿タイプ汎用画像
  const typeImage = join(IMAGES_DIR, `type-${entry.type}.png`);
  if (existsSync(typeImage)) return typeImage;

  return undefined;
}

function buildUrlWithUtm(base: string, platform: Platform, entry: CalendarEntry): string {
  const utm = new URLSearchParams({
    utm_source: platform,
    utm_medium: "social",
    utm_campaign: entry.type,
    utm_content: entry.slug ?? "freeform",
  });
  return `${base}?${utm.toString()}`;
}

export async function main(today: string): Promise<void> {
  const calendar = loadCalendar(CALENDAR_PATH);
  const entry = findTodayEntry(calendar, today);

  if (!entry) {
    console.log(`[${today}] No post scheduled. Exiting.`);
    return;
  }

  console.log(`[${today}] type=${entry.type} platforms=${entry.platforms.join(",")}`);

  const article = entry.slug
    ? readArticleMetadata(entry.slug, CONTENT_DIR)
    : null;
  const articleBase = entry.slug
    ? `${SITE_BASE}/guide/${entry.slug}/`
    : SITE_BASE;

  const generated = await generatePost(entry, article);
  const imagePath = resolveImagePath(entry, today);
  if (imagePath) {
    console.log(`[${today}] image=${imagePath}`);
  }
  const results: string[] = [];

  if (entry.platforms.includes("x") && generated.x) {
    const url = buildUrlWithUtm(articleBase, "x", entry);
    const text = generated.x.replace("{{url}}", url);
    const tweetId = await postToX(text, imagePath);
    results.push(`X: https://twitter.com/i/web/status/${tweetId}`);
  }

  const instagramReady =
    process.env["INSTAGRAM_USER_ID"] && process.env["INSTAGRAM_ACCESS_TOKEN"];
  if (entry.platforms.includes("instagram") && generated.instagram && instagramReady) {
    const url = buildUrlWithUtm(articleBase, "instagram", entry);
    const caption = generated.instagram.replace("{{url}}", url);
    const postId = await postToInstagram(caption, url);
    results.push(`Instagram: ${postId}`);
  } else if (entry.platforms.includes("instagram") && !instagramReady) {
    console.log("Instagram skipped: credentials not configured.");
  }

  console.log("Posted:", results.join(", "));
}

// CLI entry point (GitHub Actions)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const today = new Date().toISOString().slice(0, 10);
  main(today).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
