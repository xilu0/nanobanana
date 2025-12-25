# Nano Banana MCP Server 技术架构文档

## 1. 系统概述

Nano Banana MCP Server 是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 标准实现的模型上下文服务。它充当 AI 助手（如 Claude Code）与 Google Gemini 图像生成能力之间的桥梁，提供了一套标准化的工具集，用于生成、编辑和修复图像。

本服务设计遵循"无状态"、"BYOK (Bring Your Own Key)" 和 "双模通信 (SSE/Stdio)" 原则，旨在提供安全、灵活且易于集成的图像生成能力。

## 2. 系统架构

### 2.1 高层架构图

```mermaid
graph TD
    Client[MCP Client\n(e.g., Claude Code)] -->|JSON-RPC over SSE/Stdio| Server[Nano Banana\nMCP Server]
    Server -->|HTTP/REST| Proxy[API Gateway\n(claude-code.club)]
    Proxy -->|gRPC/HTTP| Gemini[Google Gemini API\n(Imagen 3)]
    
    subgraph "Nano Banana Server Container"
        Handler[MCP Protocol Handler]
        Generator[Image Generator Core]
        Auth[Auth Validator (BYOK)]
        FS[File System\n(Local Cache)]
    end
    
    Client -- Auth Token --> Server
    Server -- Base64 Image --> Client
```

### 2.2 核心组件

1.  **协议处理层 (MCP Protocol Handler)**
    *   基于 `@modelcontextprotocol/sdk` 实现。
    *   **Transport Agnostic**: 支持标准输入输出 (Stdio) 和 Server-Sent Events (SSE) 两种传输模式，适配本地 CLI 和远程服务两种场景。
    *   负责解析 `ListTools`, `CallTool`, `ListPrompts` 等标准 MCP 请求。

2.  **图像生成核心 (Image Generator Core)**
    *   封装 Google GenAI SDK。
    *   负责构建提示词 (Prompt Engineering)，处理样式 (Styles) 和变体 (Variations) 参数。
    *   实现与 Google Gemini 模型的 API 交互。

3.  **文件处理与响应构建 (File Handling & Response)**
    *   **本地存储**: 将生成的图像暂时持久化到本地文件系统 (`nanobanana-output/`)。
    *   **Base64 编码返回**: 关键设计。为了确保 MCP Client (如 Claude Code) 能直接在界面渲染图像，服务读取生成的图像文件，将其转换为 Base64 编码字符串，并封装在 MCP 响应的 standard content block 中。

## 3. 关键技术实现

### 3.1 图像数据流与返回机制 (关键路径)

针对第三方 Client 的兼容性，能够即时预览图像至关重要。本服务实现了以下 "双重返回" 策略：

1.  **文件持久化**: 图像首先写入服务器本地磁盘，作为缓存和备份。
2.  **内联 Base64 返回**:
    *   在 `CallTool` 的响应中，除了返回文本描述外，显式包含 `type: 'image'` 的数据块。
    *   数据流向：`Gemini API` -> `Server Memory` -> `Local Disk` -> `Read into Buffer` -> `Base64 String` -> `MCP Response`。

**代码实现逻辑 (`src/index.ts`):**
```typescript
{
  type: 'image',
  data: await FileHandler.readImageAsBase64(filePath), // 原始 Base64 数据
  mimeType: 'image/png'
}
```
*此设计解决了 Client 无法直接访问 Server 本地文件路径的问题，实现了"所见即所得"的交互体验。*
*注意：为了避免 Server 端路径（如容器内临时路径）对 Client 造成困扰，文本响应中已隐藏具体的文件路径信息，仅保留成功状态提示。*

### 3.2 认证与鉴权 (Pure BYOK 模式)

为满足多租户和安全性需求，服务采用 **Pure BYOK (Bring Your Own Key)** 模式：

*   **无服务端密钥**: 服务器启动时不注入任何 API Key。
*   **按需鉴权**: 每次 `use_tool` 调用时，Client 必须通过参数 (`apiKey`) 传递凭证。
*   **多令牌支持**: 兼容 `GEMINI_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `GOOGLE_CLOUD_ACCESS_TOKEN`，由 Client 端自动探测并注入，或通过 Proxy 自动处理。

### 3.3 网络代理与模型路由

服务支持通过环境变量灵活配置上游依赖：

*   `NANOBANANA_BASE_URL`:用于指定 API 网关地址 (如 `https://claude-code.club/gemini`)，实现请求路由和中转。
*   `NANOBANANA_MODEL`: 可动态指定使用的 Gemini 模型版本 (默认 `gemini-3-pro-image-preview`)。

## 4. 接口定义 (MCP Tools)

系统对外暴露以下核心工具能力：

*   `generate_image`:通用文生图，支持 `styles`, `variations` (光照、构图等) 参数。
*   `edit_image`: 图生图编辑。
*   `generate_icon`: 专门优化的图标生成 (App Icon, Favicon)。
*   `generate_pattern`: 无缝纹理和图案生成。
*   `generate_story`: 连贯性叙事绘图，保持角色和风格的一致性。

## 5. 部署架构

推荐使用 Docker Compose 进行容器化部署，确保环境一致性：

*   **Service**: `nanobanana-mcp`
*   **Network**: 暴露 3000 端口 (SSE 模式) 或通过 Stdio 管道交互。
*   **Healthcheck**: 内置 `/health` 端点，支持容器健康监控。

---
*文档版本: v1.0 | 生成日期: 2025-12-25*
