import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadCalendar } from "./calendar.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CALENDAR_PATH = join(__dirname, "../content-calendar.yml");
const CONTENT_DIR = join(__dirname, "../../src/content/guide");

function main(): void {
  const calendar = loadCalendar(CALENDAR_PATH);

  const slugs = calendar.posts
    .map((p) => p.slug)
    .filter((s): s is string => s !== null);

  const mdxFiles = new Set(
    readdirSync(CONTENT_DIR)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""))
  );

  const missing = slugs.filter((s) => !mdxFiles.has(s));

  if (missing.length > 0) {
    console.error("❌ Missing MDX files for calendar slugs:");
    missing.forEach((s) => console.error(`  - ${s}`));
    process.exit(1);
  }

  console.log(`✅ All calendar slugs verified. (${slugs.length} slugs checked)`);
}

main();
