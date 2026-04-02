import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadCalendar, findTodayEntry } from "./calendar.js";
import { readArticleMetadata } from "./read-article.js";
import { generatePost } from "./generate-post.js";
import { postToX } from "./post-x.js";
import { postToInstagram } from "./post-instagram.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CALENDAR_PATH = join(__dirname, "../content-calendar.yml");
const CONTENT_DIR = join(__dirname, "../../src/content/guide");
const SITE_BASE = "https://satsu-tei.com";

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
  const articleUrl = entry.slug
    ? `${SITE_BASE}/guide/${entry.slug}/`
    : SITE_BASE;

  const generated = await generatePost(entry, article);
  const results: string[] = [];

  if (entry.platforms.includes("x") && generated.x) {
    const text = generated.x.replace("{{url}}", articleUrl);
    const tweetId = await postToX(text);
    results.push(`X: https://twitter.com/i/web/status/${tweetId}`);
  }

  if (entry.platforms.includes("instagram") && generated.instagram) {
    const caption = generated.instagram.replace("{{url}}", articleUrl);
    const postId = await postToInstagram(caption, articleUrl);
    results.push(`Instagram: ${postId}`);
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
