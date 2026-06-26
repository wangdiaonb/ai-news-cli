# 🤖 AI 新闻日报 CLI

每天自动从多个 RSS 源抓取 AI 新闻，用 Deepseek AI 翻译标题并生成一句话摘要，输出 Markdown 日报。

## 功能特性

- **多源聚合** — 抓取 TechCrunch、The Verge、Hacker News 三大 AI 新闻源
- **URL 去重** — 同一篇文章被多个源收录时自动去重，只保留首次出现的记录
- **AI 摘要** — 调用 Deepseek API 对每篇文章生成一句话中文摘要，替代粗糙的文本截取
- **标题翻译** — 英文标题自动翻译为中文
- **24 小时过滤** — 只保留最近 24 小时的文章
- **按时间倒序** — 最新文章排前面
- **Markdown 输出** — 生成排版精美的日报文件，可直接用任意编辑器查看
- **容错降级** — 单个源故障或 AI 调用失败不影响整体任务，自动 fallback

## 项目结构

```
f1新闻/
├── src/
│   ├── index.ts        # 入口，编排全流程 + 加载 .env
│   ├── config.ts       # RSS 源、API 配置、常量
│   ├── types.ts        # Article / FetchResult 类型定义
│   ├── fetcher.ts      # 并行抓取 RSS + 清洗原始文本
│   ├── filter.ts       # URL 去重 + 按 24 小时窗口过滤
│   ├── summarizer.ts   # Deepseek API：翻译标题 + 生成摘要
│   └── formatter.ts    # 生成 Markdown 日报
├── output/             # 日报输出目录
├── .env                # API Key 配置（不提交）
├── .gitignore
├── package.json
└── tsconfig.json
```

## 环境要求

- Node.js >= 18
- Deepseek API Key（[获取地址](https://platform.deepseek.com/)）

## 安装与配置

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key（编辑项目根目录的 .env 文件）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

> `.env` 已加入 `.gitignore`，不会提交到仓库。

## 使用方式

```bash
npm run fetch
```

输出示例：

```
🚀 开始抓取 AI 新闻...

🤖 AI 翻译+摘要中... 0/42
🤖 AI 翻译+摘要中... 5/42
...
🤖 AI 翻译+摘要中... 42/42

✅ 日报已生成: output\ai-news-2026-06-26-1545.md
📰 共收录 40 篇文章（原始 60 篇，去重 2 篇）
```

## 日报示例

```markdown
# 🤖 AI 新闻日报

> 📅 生成时间：2026/06/26 15:45 | 📰 共收录 42 篇文章，来自 3 个源

---

### `15:08` | [Hacker News] 三星准备6480亿美元豪赌，报道称AI热潮重塑韩国

[🔗 阅读原文](https://reuters.com/...)

> 据路透社报道，三星计划投资约6480亿美元，以应对人工智能热潮对韩国经济格局的深刻重塑。

---

### `14:44` | [Hacker News] 为什么每个AI演示听起来都很完美，但实际部署总是令人失望？

[🔗 阅读原文](https://news.ycombinator.com/item?id=...)

> AI在受控演示中的表现与混乱的真实世界场景之间存在显著差距，揭示了技术落地的挑战。

---

*由 ai-news-cli 自动生成*
```

## 工作原理

```
RSS 抓取 → URL 去重 → 24h 过滤 → Deepseek AI（翻译标题 + 生成摘要） → 排序 → Markdown 输出
```

- 三源并行抓取，Promise.allSettled 确保单源故障不阻塞
- 基于 URL 去重，同一篇文章被多个源收录时只保留一条
- AI 调用每批 5 篇并发，30 秒超时
- API Key 未设置时自动跳过 AI，使用原文截取作为降级方案
- 每次运行生成独立文件（`ai-news-日期-时分.md`），不互相覆盖
