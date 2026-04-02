import { readFileSync } from "fs";
import { parse } from "yaml";
import type { CalendarEntry, ContentCalendar } from "./types.js";

export function parseCalendar(yaml: string): ContentCalendar {
  const data = parse(yaml) as { posts: CalendarEntry[] };
  return { posts: data.posts };
}

export function loadCalendar(calendarPath: string): ContentCalendar {
  const raw = readFileSync(calendarPath, "utf-8");
  return parseCalendar(raw);
}

export function findTodayEntry(
  calendar: ContentCalendar,
  today: string
): CalendarEntry | null {
  return calendar.posts.find((p) => p.date === today) ?? null;
}
