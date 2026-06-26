import type { Article } from "./types.js";

/**
 * 格式化时间（HH:mm）
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 生成 Markdown 日报内容
 */
export function formatReport(articles: Article[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // 统计来源
  const sourceSet = new Set(articles.map((a) => a.source));
  const sourceList = Array.from(sourceSet).join("、");

  const lines: string[] = [];

  // 标题
  lines.push("# 🤖 AI 新闻日报");
  lines.push("");

  // 统计区
  lines.push(
    `> 📅 生成时间：${dateStr} ${timeStr} | 📰 共收录 **${articles.length}** 篇文章，来自 **${sourceSet.size}** 个源（${sourceList}）`
  );
  lines.push("");

  if (articles.length === 0) {
    lines.push("---");
    lines.push("");
    lines.push("### ⚠️ 暂无新文章");
    lines.push("");
    lines.push(`过去 24 小时内未抓取到新的 AI 相关文章。`);
    lines.push("");
  } else {
    lines.push("---");
    lines.push("");

    // 按时间倒序排列
    for (const article of articles) {
      const timeLabel = formatTime(article.pubDate);
      lines.push(`### \`${timeLabel}\` | [${article.source}] ${escapeMarkdown(article.title)}`);
      lines.push("");
      lines.push(`[🔗 阅读原文](${article.link})`);
      lines.push("");
      if (article.summary) {
        lines.push(`> ${escapeMarkdown(article.summary)}`);
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  }

  // 页脚
  lines.push("*由 ai-news-cli 自动生成*");
  lines.push("");

  return lines.join("\n");
}

/**
 * 转义 Markdown 特殊字符
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([*_`[\]()#+-.!|])/g, "\\$1");
}
