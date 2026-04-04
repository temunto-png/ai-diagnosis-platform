export type Platform = "x" | "instagram";

export type PostType =
  | "article-promo"
  | "tips"
  | "rental-aru-aru"
  | "seasonal"
  | "product-promo";

export interface CalendarEntry {
  date: string;         // "2026-04-07"
  platforms: Platform[];
  type: PostType;
  slug: string | null;
  amazon_keyword?: string;  // product-promo 時に使用
}

export interface ContentCalendar {
  posts: CalendarEntry[];
}

export interface ArticleMetadata {
  title: string;
  description: string;
  category: string;
}

export interface GeneratedPost {
  x?: string;
  instagram?: string;
}
