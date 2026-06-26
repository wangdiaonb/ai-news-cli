import type { Article } from "./types.js";
import { DEEPSEEK_API_URL, DEEPSEEK_MODEL, SUMMARIZE_CONCURRENCY } from "./config.js";

interface AiResult {
  title: string;
  summary: string;
}

/**
 * 调用 Deepseek API 为单篇文章翻译标题并生成一句话摘要
 * 返回 `{ title（中文）, summary }`，失败返回 null
 */
async function processOne(
  article: Article,
  apiKey: string
): Promise<AiResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: "system",
            content:
              "你是一个新闻编辑。对用户提供的每篇AI新闻文章，将标题翻译为中文，并用一句话概括文章要点（不超过100字）。严格按以下格式输出，不要任何额外内容：\n标题：<中文标题>\n摘要：<一句话摘要>",
          },
          {
            role: "user",
            content: `原标题：${article.title}\n内容：${article.rawDescription}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // 解析 "标题：xxx\n摘要：yyy" 格式
    const titleMatch = content.match(/标题[：:]\s*(.+)/);
    const summaryMatch = content.match(/摘要[：:]\s*(.+)/);

    if (!titleMatch || !summaryMatch) return null;

    return {
      title: titleMatch[1].trim(),
      summary: summaryMatch[1].trim(),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`  ⏱️  AI 处理超时: ${article.title.slice(0, 30)}…`);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ❌ AI 处理失败: ${article.title.slice(0, 30)}… — ${msg}`);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 分批并发调用 Deepseek API，为所有文章翻译标题 + 生成摘要
 * - 无 API Key 时跳过（保留原始标题和 fallback 摘要）
 * - 单篇失败保留原文标题和 fallback 摘要
 */
export async function summarizeArticles(articles: Article[]): Promise<Article[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log("ℹ️  未设置 DEEPSEEK_API_KEY，使用原文截取摘要\n");
    return articles;
  }

  console.log(`🤖 AI 翻译+摘要中... 0/${articles.length}`);

  for (let i = 0; i < articles.length; i += SUMMARIZE_CONCURRENCY) {
    const batch = articles.slice(i, i + SUMMARIZE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((article) => processOne(article, apiKey))
    );

    results.forEach((result, j) => {
      if (result.status === "fulfilled" && result.value) {
        articles[i + j].title = result.value.title;
        articles[i + j].summary = result.value.summary;
      }
    });

    console.log(
      `🤖 AI 翻译+摘要中... ${Math.min(i + SUMMARIZE_CONCURRENCY, articles.length)}/${articles.length}`
    );
  }

  console.log("");
  return articles;
}
