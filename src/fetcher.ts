import Parser from "rss-parser";
import type { Article } from "./types.js";
import { SOURCES, SUMMARY_MAX_CHARS } from "./config.js";

const parser = new Parser();

/**
 * 清洗 HTML 标签，返回纯文本（完整内容，不截断）
 */
function cleanDescription(description?: string): string {
  if (!description) return "";
  return description.replace(/<[^>]*>/g, "").trim();
}

/**
 * 从纯文本中截取摘要（最多 N 字，保证完整句子结尾）
 */
function truncateSummary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

/**
 * 抓取单个 RSS 源，返回 Article 数组
 */
async function fetchSource(
  name: string,
  url: string
): Promise<Article[]> {
  const feed = await parser.parseURL(url);

  const articles: Article[] = [];

  for (const item of feed.items) {
    // 有些 feed 的 pubDate 可能为空，跳过
    if (!item.pubDate) continue;

    const pubDate = new Date(item.pubDate);
    if (isNaN(pubDate.getTime())) continue;

    const rawText = cleanDescription(item.contentSnippet ?? item.content ?? item.summary);

    articles.push({
      title: item.title ?? "无标题",
      link: item.link ?? "",
      pubDate,
      source: name,
      summary: truncateSummary(rawText, SUMMARY_MAX_CHARS),  // fallback 摘要
      rawDescription: rawText,                                 // 完整文本，供 AI 总结
    });
  }

  return articles;
}

/**
 * 并行抓取所有 RSS 源
 * 单个源失败不影响其他源（allSettled）
 */
export async function fetchAllSources(): Promise<{
  articles: Article[];
  errors: { source: string; error: string }[];
}> {
  const results = await Promise.allSettled(
    SOURCES.map((s) => fetchSource(s.name, s.url))
  );

  const allArticles: Article[] = [];
  const errors: { source: string; error: string }[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
    } else {
      const sourceName = SOURCES[i].name;
      const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push({ source: sourceName, error: errMsg });
      console.warn(`⚠️  抓取 ${sourceName} 失败: ${errMsg}`);
    }
  });

  return { articles: allArticles, errors };
}
