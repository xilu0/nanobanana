# Nano Banana Getting Started Guide

Nano Banana is an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that provides powerful image generation and editing tools powered by Google Gemini.

## 🛡️ The Security Model: Pure BYOK

Nano Banana follows a **Pure Bring Your Own Key (BYOK)** architecture:
- **Zero Server-Side Storage**: The deployment server does not store or see your API keys.
- **Required `apiKey`**: Every tool call (image generation, editing, etc.) **must** include an `apiKey` parameter provided by the client.
- **Privacy**: Your credentials stay in your local environment and are only passed over the wire during specific tool execution.

---

## 🛠️ Installation & Setup

### 1. Claude Code

**Claude Code** is the best way to experience Nano Banana. It natively supports SSE (Server-Sent Events) for remote tool access.

#### Installation
Run the following command in your terminal:
```bash
claude mcp add --transport sse nanobanana https://nanobanana.ai-code.club/sse
```

#### Authentication
Since the server is in Pure BYOK mode, you need to tell Claude to use your local tokens. Give Claude the following "System Instruction" or prompt at the start:

> "Use the `nanobanana` tools for any image-related requests. For the mandatory `apiKey` argument, use the value of my local environment variable `ANTHROPIC_AUTH_TOKEN`. If that's not available, use `GOOGLE_CLOUD_ACCESS_TOKEN` or `GEMINI_API_KEY`."

---

### 2. Codex / VS Code

If you are using **Codex** or other VS Code extensions that support MCP:

1. **Add SSE Server**: Use the endpoint `https://nanobanana.ai-code.club/sse`.
2. **Handle Arguments**: Ensure your client is configured to pass your local `GOOGLE_CLOUD_ACCESS_TOKEN` or `GEMINI_API_KEY` into the `apiKey` parameter of the tool.
3. **Endpoint Mapping**: The API calls will be routed through `https://claude-code.club/gemini` (as configured in the server's `NANOBANANA_BASE_URL`).

---

### 3. Gemini CLI Users

The Nano Banana server can be used alongside the **Gemini CLI** to extend its capabilities with image-specific tools.

- **Environment Vars**: Ensure you have `export GEMINI_API_KEY="..."` in your shell.
- **Command Integration**: Many slash commands (like `/icon`, `/pattern`) are exposed as MCP Prompts. You can call them directly from any MCP-compatible interface.

---

## 🔑 Supported Token Types

When calling a tool, the `apiKey` argument can be any of the following:

| Token Type | Source Environment | Recommended For |
| :--- | :--- | :--- |
| `ANTHROPIC_AUTH_TOKEN` | Claude Code | Default Claude users |
| `GOOGLE_CLOUD_ACCESS_TOKEN` | GCP / Codex | Enterprise / GCP users |
| `GEMINI_API_KEY` | Google AI Studio | General developers |

---

## 🚀 Available Tools

Once installed, you can use tools like:
- `generate_image`: Text-to-image with styles.
- `edit_image`: Modify existing images.
- `generate_icon`: Fast app icon generation.
- `generate_story`: Create a sequence of consistent images.
- `generate_diagram`: Technical flows and architecture charts.

## ❓ Troubleshooting

### Error: `apiKey is a required property`
**Cause**: The AI client didn't provide a key in the tool call.
**Solution**: Remind the AI to: *"Please provide an apiKey for this tool call. You can find it in my local ANTHROPIC_AUTH_TOKEN environment variable."*

---

## ✨ Commands & Capabilities

You can interact with Nano Banana using precise **Slash Commands** or simply by chatting in **Natural Language**. You don't need to know technical function names—just tell the AI what you want!

### 1. 🎨 Core Design

#### `/generate`
The primary command for creating images.
- **Syntax**: `/generate "prompt" [options]`
- **Natural Language**: *"Generate an image of a cyberpunk city."* | *"Draw me a cat."*

| Option | Example | Description |
| :--- | :--- | :--- |
| `--count` | `--count=4` | Generate multiple variations |
| `--styles` | `--styles="watercolor,sketch"` | Apply artistic styles |
| `--seed` | `--seed=123` | Use a specific seed for reproducibility |

#### `/nanobanana`
An all-purpose creative assistant mode.
- **Syntax**: `/nanobanana [any request]`
- **Natural Language**: *"I need a creative design for a coffee shop logo."*

---

### 2. 🧩 Design Assets

#### `/icon`
Create production-ready icons, favicons, or UI elements.
- **Syntax**: `/icon "description" [options]`
- **Natural Language**: *"Make an app icon for a meditation app."* | *"Create a favicon for my blog."*

| Option | Example | Description |
| :--- | :--- | :--- |
| `--type` | `--type="app-icon"` | `app-icon`, `favicon`, or `ui-element` |
| `--sizes` | `--sizes="64,128"` | Specific pixel sizes to generate |
| `--corners` | `--corners="rounded"` | `rounded` or `sharp` (for app icons) |

#### `/pattern`
Generate seamless textures and wallpapers.
- **Syntax**: `/pattern "description" [options]`
- **Natural Language**: *"Generate a seamless floral pattern for a website background."*

| Option | Example | Description |
| :--- | :--- | :--- |
| `--type` | `--type="seamless"` | `seamless`, `texture`, or `wallpaper` |
| `--style` | `--style="geometric"` | `geometric`, `organic`, `abstract`, etc. |

---

### 3. 📖 Visual Storytelling

#### `/story`
Create a consistent sequence of images to tell a story or explain a process.
- **Syntax**: `/story "plot summary" [options]`
- **Natural Language**: *"Draw a 4-panel storyboard about a robot learning to love."*

| Option | Example | Description |
| :--- | :--- | :--- |
| `--steps` | `--steps=4` | Number of panels/images (2-8) |
| `--type` | `--type="comic"` | `story`, `process`, `tutorial`, `timeline` |
| `--consistent` | `--consistent=true` | Keep characters/style consistent across frames |

#### `/diagram`
Generate technical diagrams and charts.
- **Syntax**: `/diagram "technical description" [options]`
- **Natural Language**: *"Create a flowchart showing a user login process."*

| Option | Example | Description |
| :--- | :--- | :--- |
| `--type` | `--type="architecture"` | `flowchart`, `database`, `mindmap`, `architecture` |
| `--complexity` | `--complexity="detailed"` | `simple`, `detailed`, `comprehensive` |

---

### 4. 🛠️ Editing Tools

#### `/edit`
Modify an existing image based on instructions.
- **Syntax**: `/edit "filename.png" "instruction"`
- **Natural Language**: *"Add a pair of sunglasses to the dog in this photo."*

#### `/restore`
Fix, enhance, or restore old/damaged images.
- **Syntax**: `/restore "filename.png" "instruction"`
- **Natural Language**: *"Restore this old family photo, remove creases and fix colors."*
