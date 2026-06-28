# pai-arbor

基于 Next.js 的本地 RAG 聊天应用。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16、React 19、Tailwind CSS 4、Vercel AI SDK |
| 后端 | Next.js Route Handlers |
| 关系数据库 | MySQL 8 + Prisma 7 |
| 向量数据库 | ChromaDB |
| 对象存储 | MinIO（S3 兼容） |
| 日志 | Loki + Grafana（pino 推送） |
| 模型服务 | Ollama（对话 + Embedding） |

## 前置依赖

- [Node.js](https://nodejs.org/) 24+ 与 [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/)（运行 MySQL、Chroma、MinIO）
- [Ollama](https://ollama.com/)（本地 LLM 与 Embedding 服务）

可选：使用项目自带的 Nix flake 开发环境（Node 24 + pnpm）：

```bash
nix develop
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

按需修改 `.env` 中的数据库、Chroma、MinIO 配置。Ollama 相关变量说明见下方表格。

### 3. 启动基础设施

```bash
docker compose up -d
```

将启动以下服务：

| 服务 | 端口 | 用途 |
|------|------|------|
| MySQL | 3306 | 会话、消息、文件元数据 |
| ChromaDB | 8000 | 向量检索 |
| MinIO | 9000（API）/ 9001（控制台） | 文件存储 |
| Loki | 3100 | 日志接收 API（无 Web UI，应用往这里推送） |
| Grafana | 3001 | 日志查询界面（admin / admin） |

#### 日志与调试

应用通过 [pino](https://getpino.io/) 输出结构化日志，LLM 请求/回复、记忆片段等动态上下文写入 Loki（不记录固定 system 提示词全文）。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LOG_LEVEL` | 日志级别 | `debug` |
| `LOKI_URL` | Loki 推送地址 | `http://localhost:3100` |
| `LOG_TO_LOKI` | 是否推送到 Loki | `true` |

- Grafana：[http://localhost:3001](http://localhost:3001) → Explore → 数据源 Loki（Label filters 可选 `event`）
- 重启应用后新日志带 `event` label；
- 聊天请求（记忆片段等）：`{app="pai-arbor", event="llm.chat.request"}`
- 聊天回复：`{app="pai-arbor", event="llm.chat.response"}`
- 按消息过滤：`{app="pai-arbor"} | json | userMessageId="<uuid>"` 或 `assistantMessageId`
- 记忆整理：`{app="pai-arbor", event=~"llm.consolidation.*"}`
- 整理结果摘要：`{app="pai-arbor", event="llm.consolidation.complete"}`
- globalMax 前缀标记：`{app="pai-arbor", event="llm.consolidation.mark"}`
- 按 job 过滤：`{app="pai-arbor"} | json | jobId="<uuid>"`
- 设 `LOG_TO_LOKI=false` 时不记录日志（终端也不会有输出）

`consolidation_jobs.snapshot` 仅保留 `messageIds` / `userId`；LLM 输入输出在 Loki 中查询。

### 4. 初始化数据库

```bash
pnpm exec prisma generate
pnpm exec prisma db push
```

### 5. 准备 Ollama 模型

```bash
# 对话模型（名称需与 .env 中 OLLAMA_MODEL 一致）
ollama pull gemma4:26b

# Embedding 模型（代码中固定使用 nomic-embed-text）
ollama pull nomic-embed-text
```

通过环境变量指定 Ollama 地址与对话模型：

```bash
export OLLAMA_HOST=127.0.0.1:11434   # 或完整 URL
export OLLAMA_MODEL=gemma4:26b
```

### 6. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)：

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_USER` | MySQL 用户名 | `root` |
| `DATABASE_PASSWORD` | MySQL 密码 | `password` |
| `DATABASE_HOST` | MySQL 主机 | `localhost` |
| `DATABASE_PORT` | MySQL 端口 | `3306` |
| `DATABASE_NAME` | 数据库名 | `pai_arbor` |
| `CHROMA_HOST` | Chroma 主机 | `localhost` |
| `CHROMA_PORT` | Chroma 端口 | `8000` |
| `MINIO_ACCESS_KEY` | MinIO Access Key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO Secret Key | `miniopassword` |
| `MINIO_BUCKET_NAME` | 存储桶名称 | `pai-arbor` |
| `MINIO_ENDPOINT` | MinIO 地址 | `http://localhost:9000` |
| `OLLAMA_HOST` | Ollama 服务地址 | `127.0.0.1:11434` |
| `OLLAMA_MODEL` | 对话模型名称 | `gemma4:26b` |
| `LOG_LEVEL` | 日志级别 | `debug` |
| `LOKI_URL` | Loki 地址 | `http://localhost:3100` |
| `LOG_TO_LOKI` | 是否推送 Loki | `true` |

## 开发说明

- 本项目使用 **Next.js 16**，部分 API 与常见版本存在差异，编写代码前建议查阅 `node_modules/next/dist/docs/`。
- Prisma Client 生成路径为 `src/generated/prisma`，Schema 变更后需重新执行 `pnpm exec prisma generate`。
- 知识库导入失败时会自动回滚 MySQL、MinIO 与 Chroma，避免产生脏数据。

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm lint         # ESLint 检查


# 根据你的 schema.prisma 文件，生成专属于你这个项目的 Prisma Client (TypeScript 类型和方法)。
# 一般 migrate dev 和 db push 内部会自动触发它
pnpm exec prisma generate

# 开发环境用，将 schema.prisma 结构同步到数据库
pnpm exec prisma db push

# 上线前用，对比本地的 schema.prisma 和当前的迁移历史，生成一个新的 SQL 迁移文件，并应用到本地开发数据库。
pnpm exec prisma migrate dev

# 生产环境用，将 prisma/migrations 里面还没在数据库里执行过的 SQL 跑一遍
pnpm exec prisma migrate deploy

```
