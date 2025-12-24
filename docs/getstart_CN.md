# Nano Banana 快速入门指南

Nano Banana 是一个 [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) 服务器，它利用 Google Gemini 提供强大的图像生成和编辑工具。

## 🛡️ 安全模型：纯客户端鉴权 (Pure BYOK)

Nano Banana 采用 **纯客户端鉴权 (Pure Bring Your Own Key / BYOK)** 架构：
- **服务器零存储**：部署的服务器不会存储或接触您的 API Key。
- **强制必填 `apiKey`**：每一个工具调用（如生成图片、编辑图片等）**必须**包含由客户端提供的 `apiKey` 参数。
- **隐私保护**：您的凭证始终保留在您的本地环境中，仅在特定的工具执行期间通过网络传递。

---

## 🛠️ 安装与设置

### 1. Claude Code

**Claude Code** 是体验 Nano Banana 的最佳方式。它原生支持 SSE (Server-Sent Events) 以实现远程工具访问。

#### 安装
在您的终端中运行以下命令：
```bash
claude mcp add --transport sse nanobanana https://nanobanana.ai-code.club/sse
```

#### 身份验证
由于服务器处于纯 BYOK 模式，您需要告诉 Claude 使用您的本地 Token。请在开始时给 Claude 发送以下 "System Instruction" 或提示词：

> "Use the `nanobanana` tools for any image-related requests. For the mandatory `apiKey` argument, use the value of my local environment variable `ANTHROPIC_AUTH_TOKEN`. If that's not available, use `GOOGLE_CLOUD_ACCESS_TOKEN` or `GEMINI_API_KEY`."
>
> （中文大意：“对于任何图像相关的请求，请使用 `nanobanana` 工具。对于强制必填的 `apiKey` 参数，请使用我本地环境变量 `ANTHROPIC_AUTH_TOKEN` 的值。如果不可用，请使用 `GOOGLE_CLOUD_ACCESS_TOKEN` 或 `GEMINI_API_KEY`。”）

---

### 2. Codex / VS Code

如果您正在使用 **Codex** 或其他支持 MCP 的 VS Code 扩展：

1. **添加 SSE 服务器**：使用端点 `https://nanobanana.ai-code.club/sse`。
2. **处理参数**：确保您的客户端已配置好，能够将本地的 `GOOGLE_CLOUD_ACCESS_TOKEN` 或 `GEMINI_API_KEY` 传递给工具的 `apiKey` 参数。
3. **端点映射**：API 调用将通过 `https://claude-code.club/gemini` 进行路由（这是服务器中配置的 `NANOBANANA_BASE_URL`）。

---

### 3. Gemini CLI 用户

Nano Banana 服务器可以与 **Gemini CLI** 配合使用，通过图像特定工具扩展其能力。

- **环境变量**：确保您的 shell 中已配置 `export GEMINI_API_KEY="..."`。
- **命令集成**：许多斜杠命令（如 `/icon`, `/pattern`）都以 MCP Prompts 的形式暴露出来。您可以从任何兼容 MCP 的界面直接调用它们。

---

## 🔑 支持的 Token 类型

在调用工具时，`apiKey` 参数可以是以下任意一种：

| Token 类型 | 来源环境 | 推荐适用 |
| :--- | :--- | :--- |
| `ANTHROPIC_AUTH_TOKEN` | Claude Code | 默认 Claude 用户 |
| `GOOGLE_CLOUD_ACCESS_TOKEN` | GCP / Codex | 企业 / GCP 用户 |
| `GEMINI_API_KEY` | Google AI Studio | 一般开发者 |

---

## 🚀 可用工具

安装完成后，您可以使用的工具包括：
- `generate_image`: 带风格选项的文本转图片工具。
- `edit_image`: 修改现有图片。
- `generate_icon`: 快速生成 App 图标。
- `generate_story`: 创建风格一致的连续图片。
- `generate_diagram`: 生成技术流程图和架构图。

## ❓ 故障排除

### 错误：`apiKey is a required property`
**原因**：AI 客户端在调用工具时未提供 Key。
**解决方案**：提醒 AI：*"Please provide an apiKey for this tool call. You can find it in my local ANTHROPIC_AUTH_TOKEN environment variable."* （"请为本次工具调用提供 apiKey。你可以在我本地的 ANTHROPIC_AUTH_TOKEN 环境变量中找到它。"）

---

## ✨ 命令与能力

您可以使用精确的 **斜杠命令 (Slash Commands)** 与 Nano Banana 交互，也可以直接使用 **自然语言** 聊天。您不需要知道底层的函数名称——只需告诉 AI 您的需求即可！

### 1. 🎨 核心设计

#### `/generate`
用于创建图像的主要命令。
- **语法**：`/generate "提示词" [选项]`
- **自然语言**：*"生成一张赛博朋克城市的图片"* | *"给我画一只猫"*

| 选项 | 示例 | 描述 |
| :--- | :--- | :--- |
| `--count` | `--count=4` | 生成多个变体 |
| `--styles` | `--styles="watercolor,sketch"` | 应用艺术风格 |
| `--seed` | `--seed=123` | 使用特定种子以确保可重现性 |

#### `/nanobanana`
全能创意助手模式。
- **语法**：`/nanobanana [任意请求]`
- **自然语言**：*"我需要一个咖啡店 Logo 的创意设计。"*

---

### 2. 🧩 设计资产

#### `/icon`
创建可直接用于生产的图标、Favicon 或 UI 元素。
- **语法**：`/icon "描述" [选项]`
- **自然语言**：*"为一个冥想 App 制作图标"* | *"为我的博客创建一个 Favicon"*

| 选项 | 示例 | 描述 |
| :--- | :--- | :--- |
| `--type` | `--type="app-icon"` | `app-icon` (应用图标), `favicon` (网站图标), 或 `ui-element` (UI元素) |
| `--sizes` | `--sizes="64,128"` | 指定生成的像素尺寸 |
| `--corners` | `--corners="rounded"` | `rounded` (圆角) 或 `sharp` (直角) (仅限应用图标) |

#### `/pattern`
生成无缝纹理和壁纸。
- **语法**：`/pattern "描述" [选项]`
- **自然语言**：*"为网站背景生成一个无缝花卉图案"*

| 选项 | 示例 | 描述 |
| :--- | :--- | :--- |
| `--type` | `--type="seamless"` | `seamless` (无缝), `texture` (纹理), 或 `wallpaper` (壁纸) |
| `--style` | `--style="geometric"` | `geometric` (几何), `organic` (有机), `abstract` (抽象) 等 |

---

### 3. 📖 视觉叙事

#### `/story`
创建一系列一致的图片来讲述故事或解释过程。
- **语法**：`/story "情节摘要" [选项]`
- **自然语言**：*"画一个关于机器人学会爱的四格故事板"*

| 选项 | 示例 | 描述 |
| :--- | :--- | :--- |
| `--steps` | `--steps=4` | 图片/面板的数量 (2-8) |
| `--type` | `--type="comic"` | `story` (故事), `process` (过程), `tutorial` (教程), `timeline` (时间线) |
| `--consistent` | `--consistent=true` | 在不同帧之间保持角色/风格一致 |

#### `/diagram`
生成技术图表和架构图。
- **语法**：`/diagram "技术描述" [选项]`
- **自然语言**：*"创建一个展示用户登录流程的流程图"*

| 选项 | 示例 | 描述 |
| :--- | :--- | :--- |
| `--type` | `--type="architecture"` | `flowchart` (流程图), `database` (数据库), `mindmap` (思维导图), `architecture` (架构图) |
| `--complexity` | `--complexity="detailed"` | `simple` (简单), `detailed` (详细), `comprehensive` (全面) |

---

### 4. 🛠️ 编辑工具

#### `/edit`
根据指令修改现有图片。
- **语法**：`/edit "文件名.png" "修改指令"`
- **自然语言**：*"给这张照片里的狗戴上一副墨镜"*

#### `/restore`
修复、增强或还原旧照片/受损照片。
- **语法**：`/restore "文件名.png" "修复指令"`
- **自然语言**：*"修复这张旧家庭照片，去除折痕并修正颜色"*
