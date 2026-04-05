import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const guide = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/guide" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string(),
    tags: z.array(z.string()),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
    howto: z.boolean().optional(),
    steps: z
      .array(
        z.object({
          name: z.string(),
          text: z.string(),
        })
      )
      .optional(),
    summary: z.array(z.string()).optional(),
    relatedGroup: z.string().optional(),
  }),
});

export const collections = { guide };
