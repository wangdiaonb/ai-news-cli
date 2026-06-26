import type { Article } from "./types.js";
import {
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  DEEPSEEK_CONTEXT_LIMIT,
  SUMMARIZE_CONCURRENCY,
} from "./config.js";

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface AiResult {
  title: string;
  summary: string;
  usage: TokenUsage;
}

/**
 * 调用 Deepseek API 翻译标题 + 生成摘要
 * 失败返回 null
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
        max_tokens: 600,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // 解析 "标题：xxx\n摘要：yyy"
    const titleMatch = content.match(/标题[：:]\s*(.+)/);
    const summaryMatch = content.match(/摘要[：:]\s*(.+)/);
    if (!titleMatch || !summaryMatch) return null;

    return {
      title: titleMatch[1].trim(),
      summary: summaryMatch[1].trim(),
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
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

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/**
 * 分批并发调用 Deepseek API，翻译标题 + 生成摘要
 */
export async function summarizeArticles(articles: Article[]): Promise<Article[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log("ℹ️  未设置 DEEPSEEK_API_KEY，使用原文截取摘要\n");
    return articles;
  }

  const totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let successCount = 0;
  let failCount = 0;

  console.log(`🤖 AI 翻译+摘要中... 0/${articles.length} | Token: 0`);

  for (let i = 0; i < articles.length; i += SUMMARIZE_CONCURRENCY) {
    const batch = articles.slice(i, i + SUMMARIZE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((article) => processOne(article, apiKey))
    );

    results.forEach((result, j) => {
      if (result.status === "fulfilled" && result.value) {
        articles[i + j].title = result.value.title;
        articles[i + j].summary = result.value.summary;
        totalUsage.promptTokens += result.value.usage.promptTokens;
        totalUsage.completionTokens += result.value.usage.completionTokens;
        totalUsage.totalTokens += result.value.usage.totalTokens;
        successCount++;
      } else {
        failCount++;
      }
    });

    const done = Math.min(i + SUMMARIZE_CONCURRENCY, articles.length);
    const avg = successCount > 0 ? Math.round(totalUsage.totalTokens / successCount) : 0;
    console.log(
      `🤖 AI 翻译+摘要中... ${done}/${articles.length} | Token: ${fmt(totalUsage.totalTokens)} (均${avg}/篇)`
    );
  }

  // 汇总统计
  const pct = ((totalUsage.totalTokens / DEEPSEEK_CONTEXT_LIMIT) * 100).toFixed(2);
  console.log("");
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Token 用量统计`);
  console.log(`   模型: ${DEEPSEEK_MODEL} | 上下文上限: ${fmt(DEEPSEEK_CONTEXT_LIMIT)}`);
  console.log(`   提示: ${fmt(totalUsage.promptTokens)} | 补全: ${fmt(totalUsage.completionTokens)} | 合计: ${fmt(totalUsage.totalTokens)}`);
  console.log(`   上下文使用占比: ${pct}% | 成功: ${successCount} | 失败: ${failCount}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log("");

  return articles;
}
