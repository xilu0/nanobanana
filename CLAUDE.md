# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Banana is an MCP (Model Context Protocol) server extension for Gemini CLI that provides AI-powered image generation, editing, and manipulation tools using Google's Gemini models (`gemini-2.5-flash-image` or `gemini-3-pro-image-preview`).

## Build Commands

```bash
# Build the project (compiles TypeScript in mcp-server/)
npm run build

# Install dependencies for mcp-server
npm run install-deps

# Development mode with TypeScript watch
npm run dev

# Type checking without emitting
npm run typecheck

# Lint and format
npm run lint
npm run format

# Full pre-flight check (clean, install, format, lint, build, typecheck)
npm run preflight
```

## Architecture

### Source Structure
```
mcp-server/src/
├── index.ts          # MCP server entry point, tool/prompt handlers
├── imageGenerator.ts # Gemini API interactions, image generation logic
├── fileHandler.ts    # File I/O, filename generation, path resolution
└── types.ts          # Shared TypeScript interfaces
```

### Key Components

**NanoBananaServer** (`index.ts`):
- Creates MCP server using `@modelcontextprotocol/sdk`
- Registers 7 tools: `generate_image`, `edit_image`, `restore_image`, `generate_icon`, `generate_pattern`, `generate_story`, `generate_diagram`
- Embeds prompt definitions as hardcoded object (not loaded from files)
- Supports both `stdio` and `sse` transport modes via `TRANSPORT` env var
- All tools require `apiKey` parameter (BYOK mode)

**ImageGenerator** (`imageGenerator.ts`):
- Wraps `@google/genai` SDK for Gemini API calls
- Handles batch generation with styles/variations
- Manages image preview (opens in default viewer if `--preview` flag set)
- Parses API responses for base64 image data in either `inlineData.data` or `text` fields

**FileHandler** (`fileHandler.ts`):
- Output directory: `nanobanana-output/` (auto-created)
- Search paths for input images: cwd, `images/`, `input/`, `nanobanana-output/`, `~/Downloads/`, `~/Desktop/`
- Generates sanitized filenames from prompts with auto-incrementing counters

### Transport Modes

- **stdio** (default): Standard MCP stdio transport for CLI integration
- **sse**: HTTP/SSE transport on port 3000 (set `TRANSPORT=sse`)
  - `/health` - Health check endpoint
  - `/sse` - SSE connection endpoint
  - `/messages` - Message POST endpoint

### Environment Variables

- `NANOBANANA_MODEL` - Model name (default: `gemini-3-pro-image-preview`)
- `NANOBANANA_BASE_URL` - Custom API base URL (optional)
- `TRANSPORT` - Transport mode: `stdio` or `sse`
- `PORT` - SSE server port (default: 3000)

## Docker

```bash
# Build image
docker build -t nanobanana .

# Run with SSE transport
docker run -p 3000:3000 -e TRANSPORT=sse nanobanana
```

The Dockerfile uses a multi-stage build: builder stage compiles TypeScript, production stage runs only the compiled output with production dependencies.

## Type System

The project uses strict TypeScript with ES2020 target and ESNext modules. Key interfaces:
- `ImageGenerationRequest` - Request parameters for all image operations
- `ImageGenerationResponse` - Standardized response with success/error status
- `AuthConfig` - API key configuration
- `*PromptArgs` interfaces for icon, pattern, diagram parameter typing
