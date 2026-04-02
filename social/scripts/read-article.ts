import { readFileSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import type { ArticleMetadata } from "./types.js";

export function readArticleMetadata(slug: string, contentDir: string): ArticleMetadata {
  const filePath = join(contentDir, `${slug}.mdx`);
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  return {
    title: data["title"] as string,
    description: data["description"] as string,
    category: data["category"] as string,
  };
}
