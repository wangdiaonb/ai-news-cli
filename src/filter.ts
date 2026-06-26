import type { Article } from "./types.js";
import { HOURS_WINDOW } from "./config.js";

/**
 * 基于 URL 去重，保留首次出现的记录
 */
export function dedupByUrl(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });
}

/**
 * 筛选最近 N 小时内的文章
 */
export function filterRecent(articles: Article[]): Article[] {
  const cutoff = new Date(Date.now() - HOURS_WINDOW * 60 * 60 * 1000);
  return articles.filter((a) => a.pubDate >= cutoff);
}
