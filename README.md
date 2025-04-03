# LLMGraphChat

## 1. 项目概述

**项目名称**：LLMGraphChat  
**项目目标**：  
- 构建一个交互式系统，允许用户提出自然语言问题，系统利用大语言模型（LLM）理解用户意图，并基于 Neo4j 图形数据库查询相应数据，最终展示图形化结果。  
- 通过直观的图形展示，帮助用户更好地理解和分析数据间的关系。

---

## 2. 技术选型

- **编程语言**：TypeScript  
  - 保证代码的静态类型检查与易维护性，适用于前后端开发。
- **前端框架**：Next.js  
  - 提供服务端渲染和静态生成能力，优化用户体验和性能。
- **UI组件库**：Radix UI + Tailwind CSS  
  - 提供美观、响应式的用户界面组件。
- **包管理工具**：pnpm  
  - 使用 `pnpm dev` 命令启动项目，保证高效、快速的开发环境搭建。
- **图形数据库**：Neo4j  
  - 用于存储和管理复杂的数据关系，支持高性能的图查询和图形展示。
- **大语言模型**：LLM  
  - 用于理解用户自然语言输入并转换为图数据库查询。
- **图形可视化**：React Force Graph  
  - 提供交互式的图形数据可视化能力。

---

## 3. 系统架构

### 3.1 总体架构

- **前端**  
  - 提供用户输入问题的交互界面，并展示查询结果的图形化视图。
- **后端服务**  
  - 接收用户输入，将自然语言问题传递给大语言模型（LLM）进行意图解析。
  - 根据解析结果构造对应的 Neo4j 查询语句，并执行查询。
  - 将查询结果返回给前端进行图形化展示。
- **数据库层**  
  - Neo4j 作为图形数据库，存储数据和关系图谱，提供高效的图查询能力。

### 3.2 数据流

1. 用户在前端输入问题。
2. 前端将问题发送到后端 API。
3. 后端使用 LLM 模块解析问题，并生成对应的查询逻辑。
4. 后端构造 Neo4j 查询语句，并调用数据库接口查询数据。
5. 查询结果经过后端处理后返回给前端。
6. 前端根据返回的数据进行图形化展示。

---

## 4. 功能

### 4.1 用户交互模块

- **问题输入界面**  
  - 提供文本框，允许用户输入自然语言问题。
  - 支持语音输入（可选扩展）。

- **结果展示界面**  
  - 展示图形数据库查询结果，支持节点和边的可视化展示。
  - 允许用户对图形进行放大、缩小、拖拽等交互操作。
  - 支持点击节点查看详细信息。

### 4.2 后端处理模块

- **LLM 解析模块**  
  - 集成大语言模型（LLM），对用户输入进行语义理解。
  - 将自然语言问题映射为具体的查询需求（例如：确定需要查询的节点、关系和属性）。

- **查询构造与执行模块**  
  - 根据 LLM 的解析结果构造相应的 Neo4j 查询语句（例如：Cypher 查询）。
  - 调用 Neo4j 数据库接口，执行查询操作并返回数据。

- **结果数据处理模块**  
  - 对查询结果进行必要的格式化处理，便于前端图形化展示。
  - 支持数据缓存和优化，提升查询效率。

---

## 5. 安装指南

### 5.1 环境要求

- Node.js 18.0.0 或更高版本
- pnpm 8.0.0 或更高版本
- Neo4j 数据库（可以是本地安装或云服务）
- OpenAI API 密钥（或兼容的替代服务）

### 5.2 安装步骤

1. **克隆项目仓库**

```bash
git clone https://github.com/yourusername/llmgraph-chat.git
cd llmgraph-chat
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置环境变量（可选）**

创建 `.env.local` 文件，添加以下配置：

```
# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# Neo4j 配置
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
```

> 注意：也可以在应用的设置界面中配置这些参数。

4. **启动开发服务器**

```bash
pnpm dev
```

5. **访问应用**

打开浏览器，访问 `http://localhost:3000`

---

## 6. 使用指南

### 6.1 初始配置

1. 首次使用时，点击界面右上角的设置图标。
2. 在设置对话框中配置：
   - OpenAI API 密钥
   - OpenAI API 基础 URL（可选，默认为官方 API）
   - 选择 LLM 模型（如 gpt-4-turbo, gpt-3.5-turbo 等）
   - Neo4j 数据库连接信息（URI、用户名、密码）
3. 点击保存，设置将被存储在浏览器的本地存储中。

### 6.2 查询数据

1. 在聊天输入框中，使用自然语言输入您的查询。例如：
   - "显示所有人物及其关系"
   - "查找与张三有直接联系的所有人"
   - "显示所有公司及其投资关系"
2. 系统会将您的问题转换为 Cypher 查询语句，并从 Neo4j 数据库中检索数据。
3. 查询结果将以图形方式在界面上展示。

### 6.3 图形交互

- **缩放**：使用界面上的放大/缩小按钮或鼠标滚轮调整图形大小。
- **平移**：点击并拖动图形区域可移动视图。
- **查看节点详情**：点击任意节点可在侧边显示其详细属性信息。
- **调整布局**：图形会自动调整布局以优化显示效果。

---

## 7. API 文档

### 7.1 Chat API

**端点**: `/api/chat`

**方法**: POST

**请求体**:
```json
{
  "messages": [
    { "role": "user", "content": "查询问题" }
  ],
  "openaiApiKey": "your_api_key",
  "openaiBaseUrl": "https://api.openai.com/v1",
  "modelName": "gpt-3.5-turbo",
  "neo4jUri": "neo4j://localhost:7687",
  "neo4jUsername": "neo4j",
  "neo4jPassword": "password"
}
```

**响应**:
```json
{
  "message": {
    "role": "assistant",
    "content": "回复内容"
  },
  "graphData": {
    "nodes": [...],
    "links": [...]
  },
  "cypherQuery": "MATCH (n) RETURN n LIMIT 10"
}
```

### 7.2 Schema API

**端点**: `/api/schema`

**方法**: GET

**查询参数**:
- `neo4jUri`: Neo4j 数据库 URI
- `neo4jUsername`: Neo4j 用户名
- `neo4jPassword`: Neo4j 密码

**响应**:
```json
{
  "nodeLabels": ["Person", "Company", ...],
  "relationshipTypes": ["KNOWS", "WORKS_AT", ...],
  "nodeProperties": {
    "Person": ["name", "age", ...],
    "Company": ["name", "founded", ...]
  }
}
```

---

## 8. 项目贡献

### 8.1 开发规范

- 使用 TypeScript 进行开发，确保类型安全。
- 遵循 ESLint 和 Prettier 配置的代码风格。
- 组件开发遵循 React 最佳实践。

---

## 9. 常见问题

### 9.1 连接问题

**问题**: 无法连接到 Neo4j 数据库

**解决方案**:
- 确认 Neo4j 数据库正在运行
- 验证连接 URI、用户名和密码是否正确
- 检查网络连接和防火墙设置

### 9.2 API 限制

**问题**: OpenAI API 调用失败

**解决方案**:
- 确认 API 密钥有效且未过期
- 检查 API 使用配额是否已用尽
- 考虑使用替代的 API 基础 URL

---

## 10. 许可证

本项目许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。


---

感谢使用 LLMGraphChat！





