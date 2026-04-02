import { describe, it, expect } from "vitest";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readArticleMetadata } from "../scripts/read-article.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "../../src/content/guide");

describe("readArticleMetadata", () => {
  it("reads title, description, and category from MDX frontmatter", () => {
    const meta = readArticleMetadata("wallpaper-repair", CONTENT_DIR);
    expect(meta.title).toBe("壁紙の補修方法まとめ【剥がれ・破れ・穴の直し方】");
    expect(meta.description).toContain("壁紙");
    expect(meta.category).toBe("DIY補修");
  });

  it("throws when slug does not exist", () => {
    expect(() => readArticleMetadata("nonexistent-slug", CONTENT_DIR)).toThrow();
  });
});
