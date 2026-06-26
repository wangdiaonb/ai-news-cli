import type { Article } from "./types.js";
import { HOURS_WINDOW } from "./config.js";

/**
 * 筛选最近 N 小时内的文章
 */
export function filterRecent(articles: Article[]): Article[] {
  const cutoff = new Date(Date.now() - HOURS_WINDOW * 60 * 60 * 1000);
  return articles.filter((a) => a.pubDate >= cutoff);
}
