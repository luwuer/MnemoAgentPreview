# 🧠 Mnemo

> 具有人类记忆机制的个人助理 Agent

Mnemo 是一个模仿人类记忆机制的个人助理 Agent。它通过 **Neo4j 图数据库永久存储记忆**，利用 **记忆图关联实现渐进式记忆展开**（模拟人类联想回忆过程），并支持 **Skills / MCP / Rules** 等 Agent 通用扩展机制。

## ✨ 核心特性

- **记忆永久保存** — 所有记忆持久化到 Neo4j，永不物理删除，仅做软衰减降权
- **渐进式记忆展开** — 从当前对话锚点出发，沿关联边逐跳召回（带权 BFS），模拟人类"联想"，避免一次性全量注入上下文
- **记忆类型分层** — Episodic（事件）/ Semantic（事实）/ Procedural（流程），参考认知科学分类
- **记忆固化与衰减** — 短期对话记忆自动沉淀为长期记忆；艾宾浩斯遗忘曲线驱动衰减与强化
- **Agent 通用机制** — 支持 Skills（Markdown + Frontmatter）、MCP 协议（stdio + SSE）、Rules（全局 + 项目级）
- **国产 LLM 适配** — 通过 OpenAI 兼容接口支持 DeepSeek / 通义 / 智谱 等
- **可视化记忆图谱** — Web UI（Vue 3）力导向图实时展示记忆关联，支持点击节点渐进展开

## 🏗️ 架构

```
MnemoAgentPreview/
├── packages/
│   ├── core/      # Agent 核心逻辑（记忆系统 / LLM / Skills / MCP / Rules）
│   ├── server/    # Fastify HTTP + WebSocket 服务
│   └── web/       # Vue 3 前端（对话 + 记忆图谱可视化）
├── config/        # 默认配置与规则
├── skills/        # 示例 Skills
└── docker-compose.yml
```

## 🚀 快速开始

### 前置要求

- Node.js 20+
- pnpm 9+
- Docker（用于启动 Neo4j）

### 1. 启动 Neo4j

```bash
docker compose up -d
# 访问 http://localhost:7474  (neo4j / mnemo_dev_password)
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置

复制配置模板并填入你的 LLM API Key：

```bash
cp config/mnemo.config.yaml config/mnemo.config.local.yaml
# 编辑 mnemo.config.local.yaml，设置 LLM apiKey 等
```

### 4. 启动开发服务

```bash
pnpm dev          # 同时启动 server + web
# 或分开启动:
pnpm dev:server   # 后端 http://localhost:3000
pnpm dev:web      # 前端 http://localhost:5173
```

## 🧩 记忆机制说明

Mnemo 的记忆系统模仿人类认知机制：

| 机制 | 说明 |
|------|------|
| **记忆类型** | Episodic（事件）、Semantic（知识）、Procedural（流程） |
| **记忆关联** | 时间顺承、因果、相似、从属、引用、联想、派生 |
| **渐进式召回** | 语义锚点定位 → 带权 BFS 展开 → 评分剪枝 → 按相关度注入上下文 |
| **记忆固化** | 对话沉淀为长期记忆，自动建立与已有记忆的关联 |
| **衰减强化** | 遗忘曲线驱动衰减，访问频次提升权重，低权重降级但不删除 |

## 📦 技术栈

- **语言**: TypeScript（全栈）
- **记忆存储**: Neo4j 5.x（图数据库 + 原生向量索引）
- **LLM**: OpenAI 兼容接口（DeepSeek / 通义 / 智谱）
- **MCP**: @modelcontextprotocol/sdk
- **后端**: Fastify + WebSocket
- **前端**: Vue 3 + Vite + Pinia + vis-network + Tailwind CSS

## 📄 License

MIT
