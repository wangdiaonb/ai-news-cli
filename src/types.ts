export interface Article {
  /** 文章标题 */
  title: string;
  /** 文章链接 */
  link: string;
  /** 发布时间 */
  pubDate: Date;
  /** 来源名称 */
  source: string;
  /** 最终摘要（AI 生成或 fallback） */
  summary: string;
  /** 原始全文描述，供 AI 总结用 */
  rawDescription: string;
}

export interface FetchResult {
  source: string;
  articles: Article[];
  error?: string;
}
