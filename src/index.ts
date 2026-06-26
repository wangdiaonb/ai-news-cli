import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTPUT_DIR } from "./config.js";
import { fetchAllSources } from "./fetcher.js";
import { filterRecent } from "./filter.js";
import { summarizeArticles } from "./summarizer.js";
import { formatReport } from "./formatter.js";

// 加载项目 .env 文件（不覆盖已有的环境变量）
function loadEnv() {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  try {
    const content = readFileSync(join(dir, "..", ".env"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = trimmed.slice(eqIdx + 1).trim();
      }
    }
  } catch {
    // .env 文件不存在，跳过
  }
}
loadEnv();

async function main() {
  console.log("🚀 开始抓取 AI 新闻...\n");

  // 1. 抓取所有源
  const { articles: rawArticles, errors } = await fetchAllSources();

  // 2. 按 24 小时过滤
  const recent = filterRecent(rawArticles);

  // 3. AI 摘要（替换粗糙截取）
  await summarizeArticles(recent);

  // 4. 按时间倒序排列
  recent.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  // 5. 生成 Markdown 日报
  const report = formatReport(recent);

  // 6. 确保输出目录存在
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // 7. 写入文件（精确到分钟，每次运行生成新文件）
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
  const filename = `ai-news-${dateStr}-${timeStr}.md`;
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, report, "utf-8");

  // 7. 终端摘要
  console.log(`✅ 日报已生成: ${filepath}`);
  console.log(`📰 共收录 ${recent.length} 篇文章（原始抓取 ${rawArticles.length} 篇）`);

  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} 个源抓取失败: ${errors.map((e) => e.source).join(", ")}`);
  }
}

main().catch((err) => {
  console.error("❌ 运行失败:", err);
  process.exit(1);
});
