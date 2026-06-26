# CLAUDE.md

AI 新闻日报 CLI — 从 TechCrunch、The Verge、Hacker News 三个 RSS 源抓取 AI 新闻，用 Deepseek API 翻译标题并生成中文摘要，输出 Markdown 日报。

## 常用命令

```bash
npm run fetch          # 抓取新闻、AI 翻译+摘要、生成日报（唯一入口）
npx tsx src/index.ts   # 等价于 npm run fetch
```

- 没有测试、lint、build 脚本 — `tsx` 直接运行 TypeScript 源码，无需编译。
- 输出文件写入 `output/ai-news-日期-时分.md`，每次运行生成新文件，不覆盖。

## 架构

```
src/index.ts       入口 — 加载 .env → 编排 7 步流水线 → 终端摘要
src/config.ts      常量 — RSS 源列表、窗口小时数、API 地址/模型、并发数
src/types.ts       类型 — Article、FetchResult
src/fetcher.ts     抓取 — 并行请求 RSS（Promise.allSettled）、清洗 HTML → 纯文本
src/filter.ts      过滤 — URL 去重 + 24 小时窗口过滤
src/summarizer.ts  AI 摘要 — 调用 Deepseek 翻译标题 + 生成一句话摘要（每批 5 篇并发，30s 超时）
src/formatter.ts   输出 — 生成 Markdown 日报（按时间倒序、转义特殊字符）
```

### 数据流

```
RSS 抓取(allSettled) → URL去重 → 24h过滤 → AI摘要 → 时间倒序 → Markdown输出
```

每步都是纯函数/纯数据转换，无副作用。只有 `index.ts` 做 I/O。

## 代码约定

- **ESM 模块** (`"type": "module"`)，使用 `.js` 扩展名导入本地文件（TypeScript + tsx 约定）。
- **严格模式** (`strict: true`)，所有字段显式类型标注。
- **命名**：函数 `camelCase`，接口 `PascalCase`，常量 `UPPER_SNAKE_CASE`。
- **容错优先**：外部分（RSS、API）永远用 `allSettled`/`try-catch`，单个失败不阻塞整体。
- **降级策略**：API Key 未设置 → 保留原文截取；AI 调用失败 → 保留原始标题和 fallback 摘要；RSS 源故障 → 跳过该源继续。
- **并发控制**：RSS 抓取全部并行；AI 调用每批 5 篇（`SUMMARIZE_CONCURRENCY`），避免触发 API 限流。
- **只使用 2 个依赖**：`rss-parser`（RSS 解析）+ `tsx`（TypeScript 运行时）。不引入新的依赖。
- **配置分离**：所有可调参数集中在 `config.ts`，通过环境变量（`.env`）管理密钥。

## 注意事项

- `.env` 包含 `DEEPSEEK_API_KEY`，已在 `.gitignore` 中排除，绝不提交。
- 仅 Node.js 内建 API（`fetch`、`fs`），无 axios/request 等第三方 HTTP 库。
- Windows 开发环境，路径用 `join()` 而非硬编码分隔符。
- 输出文件名精确到分钟，同日多次运行不互相覆盖。
