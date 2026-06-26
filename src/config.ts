export interface SourceConfig {
  name: string;
  url: string;
}

/** RSS 源列表 */
export const SOURCES: SourceConfig[] = [
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  },
  {
    name: "Hacker News",
    url: "https://hnrss.org/newest?q=AI&count=30",
  },
];

/** 回溯小时数 */
export const HOURS_WINDOW = 24;

/** 输出目录 */
export const OUTPUT_DIR = "output";

/** 摘要最大字数 */
export const SUMMARY_MAX_CHARS = 100;

/** Deepseek API 地址 */
export const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

/** Deepseek 模型 */
export const DEEPSEEK_MODEL = "deepseek-v4-pro";

/** Deepseek v4-pro 上下文上限（128K） */
export const DEEPSEEK_CONTEXT_LIMIT = 131_072;

/** AI 摘要并发数 */
export const SUMMARIZE_CONCURRENCY = 5;
