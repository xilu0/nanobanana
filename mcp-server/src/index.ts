#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ImageGenerator } from './imageGenerator.js';
import {
  ImageGenerationRequest,
  IconPromptArgs,
  PatternPromptArgs,
  DiagramPromptArgs,
} from './types.js';

class NanoBananaServer {
  private server: Server;
  private imageGenerator!: ImageGenerator;
  private initializationError: Error | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'nanobanana-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      },
    );

    this.setupToolHandlers();
    this.setupPromptHandlers();
    this.setupErrorHandling();

    try {
      const authConfig = ImageGenerator.validateAuthentication();
      this.imageGenerator = new ImageGenerator(authConfig);
    } catch (error: unknown) {
      // In BYOK mode, initialization error is not fatal
      console.error('Info: Server starting in BYOK mode or waiting for configuration.');
      this.imageGenerator = new ImageGenerator();
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_image',
            description:
              'Generate single or multiple images from text prompts with style and variation options',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description:
                    'The text prompt describing the image to generate',
                },
                outputCount: {
                  type: 'number',
                  description:
                    'Number of variations to generate (1-8, default: 1)',
                  minimum: 1,
                  maximum: 8,
                  default: 1,
                },
                styles: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Array of artistic styles: photorealistic, watercolor, oil-painting, sketch, pixel-art, anime, vintage, modern, abstract, minimalist',
                },
                variations: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Array of variation types: lighting, angle, color-palette, composition, mood, season, time-of-day',
                },
                format: {
                  type: 'string',
                  enum: ['grid', 'separate'],
                  description:
                    'Output format: separate files or single grid image',
                  default: 'separate',
                },
                seed: {
                  type: 'number',
                  description: 'Seed for reproducible variations',
                },
                preview: {
                  type: 'boolean',
                  description:
                    'Automatically open generated images in default viewer',
                  default: false,
                },
                apiKey: {
                  type: 'string',
                  description: 'Required for BYOK. Use the value of your local ANTHROPIC_AUTH_TOKEN, GOOGLE_CLOUD_ACCESS_TOKEN, or GEMINI_API_KEY.',
                },
              },
              required: ['prompt', 'apiKey'],
            },
          },
          {
            name: 'edit_image',
            description: 'Edit an existing image based on a text prompt',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The text prompt describing the edits to make',
                },
                file: {
                  type: 'string',
                  description: 'The filename of the input image to edit',
                },
                preview: {
                  type: 'boolean',
                  description:
                    'Automatically open generated images in default viewer',
                  default: false,
                },
                apiKey: {
                  type: 'string',
                  description: 'Required for BYOK. Use the value of your local ANTHROPIC_AUTH_TOKEN, GOOGLE_CLOUD_ACCESS_TOKEN, or GEMINI_API_KEY.',
                },
              },
              required: ['prompt', 'file', 'apiKey'],
            },
          },
          {
            name: 'restore_image',
            description: 'Restore or enhance an existing image',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description:
                    'The text prompt describing the restoration to perform',
                },
                file: {
                  type: 'string',
                  description: 'The filename of the input image to restore',
                },
                preview: {
                  type: 'boolean',
                  description:
                    'Automatically open generated images in default viewer',
                  default: false,
                },
                apiKey: {
                  type: 'string',
                  description: 'Required for BYOK. Use the value of your local ANTHROPIC_AUTH_TOKEN, GOOGLE_CLOUD_ACCESS_TOKEN, or GEMINI_API_KEY.',
                },
              },
              required: ['prompt', 'file', 'apiKey'],
            },
          },
          {
            name: 'generate_icon',
            description:
              'Generate app icons, favicons, and UI elements in multiple sizes and formats',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description:
                    'Description of the icon or UI element to generate',
                },
                sizes: {
                  type: 'array',
                  items: { type: 'number' },
                  description:
                    'Array of icon sizes in pixels (16, 32, 64, 128, 256, 512, 1024)',
                },
                type: {
                  type: 'string',
                  enum: ['app-icon', 'favicon', 'ui-element'],
                  description: 'Type of icon to generate',
                  default: 'app-icon',
                },
                style: {
                  type: 'string',
                  enum: ['flat', 'skeuomorphic', 'minimal', 'modern'],
                  description: 'Visual style of the icon',
                  default: 'modern',
                },
                format: {
                  type: 'string',
                  enum: ['png', 'jpeg'],
                  description: 'Output format',
                  default: 'png',
                },
                background: {
                  type: 'string',
                  description:
                    'Background type: transparent, white, black, or color name',
                  default: 'transparent',
                },
                corners: {
                  type: 'string',
                  enum: ['rounded', 'sharp'],
                  description: 'Corner style for app icons',
                  default: 'rounded',
                },
                preview: {
                  type: 'boolean',
                  description:
                    'Automatically open generated images in default viewer',
                  default: false,
                },
                apiKey: {
                  type: 'string',
                  description: 'Required for BYOK. Use the value of your local ANTHROPIC_AUTH_TOKEN, GOOGLE_CLOUD_ACCESS_TOKEN, or GEMINI_API_KEY.',
                },
              },
              required: ['prompt', 'apiKey'],
            },
          },
          {
            name: 'generate_pattern',
            description:
              'Generate seamless patterns and textures for backgrounds and design elements',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description:
                    'Description of the pattern or texture to generate',
                },
                size: {
                  type: 'string',
                  description: 'Pattern tile size (e.g., "256x256", "512x512")',
                  default: '256x256',
                },
                type: {
                  type: 'string',
                  enum: ['seamless', 'texture', 'wallpaper'],
                  description: 'Type of pattern to generate',
                  default: 'seamless',
                },
                style: {
                  type: 'string',
                  enum: ['geometric', 'organic', 'abstract', 'floral', 'tech'],
                  description: 'Pattern style',
                  default: 'abstract',
                },
                density: {
                  type: 'string',
                  enum: ['sparse', 'medium', 'dense'],
                  description: 'Element density in the pattern',
                  default: 'medium',
                },
                colors: {
                  type: 'string',
                  enum: ['mono', 'duotone', 'colorful'],
                  description: 'Color scheme',
                  default: 'colorful',
                },
                repeat: {
                  type: 'string',
                  enum: ['tile', 'mirror'],
                  description: 'Tiling method for seamless patterns',
                  default: 'tile',
                },
                preview: {
                  type: 'boolean',
                  description:
                    'Automatically open generated images in default viewer',
                  default: false,
                },
                apiKey: {
                  type: 'string',
                  description: 'Required for BYOK. Use the value of your local ANTHROPIC_AUTH_TOKEN, GOOGLE_CLOUD_ACCESS_TOKEN, or GEMINI_API_KEY.',
                },
              },
              required: ['prompt', 'apiKey'],
            },
          },
          {
            name: 'generate_story',
            description:
              'Generate a sequence of related images that tell a visual story or show a process',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description:
                    'Description of the story or process to visualize',
                },
                steps: {
                  type: 'number',
                  description: 'Number of sequential images to generate (2-8)',
                  minimum: 2,
                  maximum: 8,
                  default: 4,
                },
                type: {
                  type: 'string',
                  enum: ['story', 'process', 'tutorial', 'timeline'],
                  description: 'Type of sequence to generate',
                  default: 'story',
                },
                style: {
                  type: 'string',
                  enum: ['consistent', 'evolving'],
                  description: 'Visual consistency across frames',
                  default: 'consistent',
                },
                layout: {
                  type: 'string',
                  enum: ['separate', 'grid', 'comic'],
                  description: 'Output layout format',
                  default: 'separate',
                },
                transition: {
                  type: 'string',
                  enum: ['smooth', 'dramatic', 'fade'],
                  description: 'Transition style between steps',
                  default: 'smooth',
                },
                format: {
                  type: 'string',
                  enum: ['storyboard', 'individual'],
                  description: 'Output format',
                  default: 'individual',
                },
                preview: {
                  type: 'boolean',
                  description:
                    'Automatically open generated images in default viewer',
                  default: false,
                },
                apiKey: {
                  type: 'string',
                  description: 'Required for BYOK. Use the value of your local ANTHROPIC_AUTH_TOKEN, GOOGLE_CLOUD_ACCESS_TOKEN, or GEMINI_API_KEY.',
                },
              },
              required: ['prompt', 'apiKey'],
            },
          },
          {
            name: 'generate_diagram',
            description:
              'Generate technical diagrams, flowcharts, and architectural mockups',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description:
                    'Description of the diagram content and structure',
                },
                type: {
                  type: 'string',
                  enum: [
                    'flowchart',
                    'architecture',
                    'network',
                    'database',
                    'wireframe',
                    'mindmap',
                    'sequence',
                  ],
                  description: 'Type of diagram to generate',
                  default: 'flowchart',
                },
                style: {
                  type: 'string',
                  enum: ['professional', 'clean', 'hand-drawn', 'technical'],
                  description: 'Visual style of the diagram',
                  default: 'professional',
                },
                layout: {
                  type: 'string',
                  enum: ['horizontal', 'vertical', 'hierarchical', 'circular'],
                  description: 'Layout orientation',
                  default: 'hierarchical',
                },
                complexity: {
                  type: 'string',
                  enum: ['simple', 'detailed', 'comprehensive'],
                  description: 'Level of detail in the diagram',
                  default: 'detailed',
                },
                colors: {
                  type: 'string',
                  enum: ['mono', 'accent', 'categorical'],
                  description: 'Color scheme',
                  default: 'accent',
                },
                annotations: {
                  type: 'string',
                  enum: ['minimal', 'detailed'],
                  description: 'Label and annotation level',
                  default: 'detailed',
                },
                preview: {
                  type: 'boolean',
                  description:
                    'Automatically open generated images in default viewer',
                  default: false,
                },
                apiKey: {
                  type: 'string',
                  description: 'Required for BYOK. Use the value of your local ANTHROPIC_AUTH_TOKEN, GOOGLE_CLOUD_ACCESS_TOKEN, or GEMINI_API_KEY.',
                },
              },
              required: ['prompt', 'apiKey'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (this.initializationError) {
        throw this.initializationError;
      }

      const { name, arguments: args } = request.params;

      try {
        let response;

        switch (name) {
          case 'generate_image': {
            const imageRequest: ImageGenerationRequest = {
              prompt: args?.prompt as string,
              outputCount: (args?.outputCount as number) || 1,
              mode: 'generate',
              styles: args?.styles as string[],
              variations: args?.variations as string[],
              format: (args?.format as 'grid' | 'separate') || 'separate',
              seed: args?.seed as number,
              preview: args?.preview as boolean,
              noPreview:
                (args?.noPreview as boolean) ||
                (args?.['no-preview'] as boolean),
            };
            response =
              await this.imageGenerator.generateTextToImage(imageRequest, { apiKey: args?.apiKey as string });
            break;
          }

          case 'edit_image': {
            const editRequest: ImageGenerationRequest = {
              prompt: args?.prompt as string,
              inputImage: args?.file as string,
              mode: 'edit',
              preview: args?.preview as boolean,
              noPreview:
                (args?.noPreview as boolean) ||
                (args?.['no-preview'] as boolean),
            };
            response = await this.imageGenerator.editImage(editRequest, { apiKey: args?.apiKey as string });
            break;
          }

          case 'restore_image': {
            const restoreRequest: ImageGenerationRequest = {
              prompt: args?.prompt as string,
              inputImage: args?.file as string,
              mode: 'restore',
              preview: args?.preview as boolean,
              noPreview:
                (args?.noPreview as boolean) ||
                (args?.['no-preview'] as boolean),
            };
            response = await this.imageGenerator.editImage(restoreRequest, { apiKey: args?.apiKey as string });
            break;
          }

          case 'generate_icon': {
            const iconRequest: ImageGenerationRequest = {
              prompt: this.buildIconPrompt(args),
              outputCount: (args?.sizes as number[])?.length || 1,
              mode: 'generate',
              fileFormat: (args?.format as 'png' | 'jpeg') || 'png',
              preview: args?.preview as boolean,
              noPreview:
                (args?.noPreview as boolean) ||
                (args?.['no-preview'] as boolean),
            };
            response =
              await this.imageGenerator.generateTextToImage(iconRequest, { apiKey: args?.apiKey as string });
            break;
          }

          case 'generate_pattern': {
            const patternRequest: ImageGenerationRequest = {
              prompt: this.buildPatternPrompt(args),
              outputCount: 1,
              mode: 'generate',
              preview: args?.preview as boolean,
              noPreview:
                (args?.noPreview as boolean) ||
                (args?.['no-preview'] as boolean),
            };
            response =
              await this.imageGenerator.generateTextToImage(patternRequest, { apiKey: args?.apiKey as string });
            break;
          }

          case 'generate_story': {
            const storyRequest: ImageGenerationRequest = {
              prompt: args?.prompt as string,
              outputCount: (args?.steps as number) || 4,
              mode: 'generate',
              variations: ['sequence-step'],
              preview: args?.preview as boolean,
              noPreview:
                (args?.noPreview as boolean) ||
                (args?.['no-preview'] as boolean),
            };
            response = await this.imageGenerator.generateStorySequence(
              storyRequest,
              { ...(args || {}), apiKey: args?.apiKey as string } as any,
            );
            break;
          }

          case 'generate_diagram': {
            const diagramRequest: ImageGenerationRequest = {
              prompt: this.buildDiagramPrompt(args),
              outputCount: 1,
              mode: 'generate',
              preview: args?.preview as boolean,
              noPreview:
                (args?.noPreview as boolean) ||
                (args?.['no-preview'] as boolean),
            };
            response =
              await this.imageGenerator.generateTextToImage(diagramRequest, { apiKey: args?.apiKey as string });
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        if (response.success) {
          const content: any[] = [
            {
              type: 'text',
              text: response.message,
            },
          ];

          if (response.generatedFiles && response.generatedFiles.length > 0) {
            const fs = await import('fs');
            const path = await import('path');
            const { FileHandler } = await import('./fileHandler.js');

            // Add instruction and base64 data for client to save images
            const imageFiles: { filename: string; base64: string; mimeType: string }[] = [];

            for (const file of response.generatedFiles) {
              try {
                const ext = path.extname(file).toLowerCase();
                const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
                console.error(`DEBUG - Reading image file: ${file}`);
                const base64Data = await FileHandler.readImageAsBase64(file);
                console.error(`DEBUG - Base64 data length: ${base64Data.length} characters`);

                // Generate a meaningful filename from the original
                const originalName = path.basename(file);
                imageFiles.push({ filename: originalName, base64: base64Data, mimeType });
              } catch (error) {
                console.error(`Failed to read image file ${file}:`, error);
                content[0].text += `\n\nWarning: Failed to load image content for ${path.basename(file)}`;
              }
            }

            if (imageFiles.length > 0) {
              content[0].text += '\n\n**IMPORTANT - YOU MUST SAVE THE IMAGE(S) NOW**:\n' +
                'CLI tools cannot display images inline. Run the Bash command(s) below to save each image:\n\n';

              for (let i = 0; i < imageFiles.length; i++) {
                const img = imageFiles[i];
                content[0].text += `**Image ${i + 1}**: \`${img.filename}\`\n`;
                content[0].text += `\`\`\`bash\nbase64 -d << 'EOF' > ${img.filename}\n${img.base64}\nEOF\n\`\`\`\n\n`;
              }

              content[0].text += 'Run the command(s) above using the Bash tool immediately. The user cannot see the image until you save it.';
            }
          }

          console.error(`DEBUG - Returning response with ${content.length} content blocks`);
          return {
            content,
          };
        } else {
          throw new Error(response.error || response.message);
        }
      } catch (error: unknown) {
        console.error(`Error executing tool ${name}:`, error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`An unexpected error occurred: ${String(error)}`);
      }
    });
  }


  // Prompt definitions hardcoded to avoid file system dependency issues in different environments
  private readonly PROMPT_DEFINITIONS: Record<string, { description: string; prompt: string }> = {
    generate: {
      description: 'Generate single or multiple images from a text prompt with optional style and variation controls.',
      prompt: `
You are a command parser for the nanobanana generate command. You must validate arguments and return structured data.

Valid options:
- --count=N (1-8, default: 1)
- --styles="style1,style2" (photorealistic, watercolor, oil-painting, sketch, pixel-art, anime, vintage, modern, abstract, minimalist)
- --variations="var1,var2" (lighting, angle, color-palette, composition, mood, season, time-of-day)
- --format=grid|separate (default: separate)
- --seed=123 (integer)
- --preview (flag)

User input: {{args}}

Parse this input and:
1. Extract the main prompt (text before any options)
2. Validate all options against allowed values
3. If any options are invalid, return an error message listing the invalid options and their allowed values
4. If valid, call the generate_image tool with the parsed parameters

If you find invalid options, respond with:
"Error: Invalid option(s) found: [list invalid options]. Valid options are: --count (1-8), --styles (comma-separated list from: photorealistic, watercolor, oil-painting, sketch, pixel-art, anime, vintage, modern, abstract, minimalist), --variations (comma-separated list from: lighting, angle, color-palette, composition, mood, season, time-of-day), --format (grid or separate), --seed (integer), --preview (flag)"

Otherwise, call generate_image with the validated parameters.
`,
    },
    edit: {
      description: 'Edit an existing image based on a text prompt.',
      prompt: `
You are a command parser for the nanobanana edit command. You must validate arguments and return structured data.

Valid options:
- --preview (flag)

User input: {{args}}

Parse this input and:
1. Extract the filename (first argument, required)
2. Extract the edit prompt (text after filename, before options, required)
3. Validate all options against allowed values
4. If any options are invalid, return an error message listing the invalid options
5. If required parameters are missing, return an error message
6. If valid, call the edit_image tool with the parsed parameters

Required format: filename "edit instructions" [--preview]

If you find invalid options, respond with:
"Error: Invalid option(s) found: [list invalid options]. Valid options are: --preview (flag)"

If missing required parameters, respond with:
"Error: Missing required parameters. Usage: /edit filename \\"edit instructions\\" [--preview]"

Otherwise, call edit_image with file and prompt parameters.
`,
    },
    icon: {
      description: 'Generate app icons, favicons, and UI elements in multiple sizes and formats.',
      prompt: `
You are a command parser for the nanobanana icon command. You must validate arguments and return structured data.

Valid options:
- --sizes="16,32,64" (comma-separated list of valid sizes: 16, 32, 64, 128, 256, 512, 1024)
- --type="app-icon|favicon|ui-element" (default: app-icon)
- --style="flat|skeuomorphic|minimal|modern" (default: modern)
- --format="png|jpeg" (default: png)
- --background="transparent|white|black" or color name (default: transparent)
- --corners="rounded|sharp" (default: rounded)
- --preview (flag)

User input: {{args}}

Parse this input and:
1. Extract the main prompt (text before any options, required)
2. Validate all options against allowed values
3. For --sizes, ensure all values are valid integers from the allowed list
4. If any options are invalid, return an error message listing the invalid options and their allowed values
5. If valid, call the generate_icon tool with the parsed parameters

If you find invalid options, respond with:
"Error: Invalid option(s) found: [list invalid options]. Valid options are: --sizes (comma-separated from: 16, 32, 64, 128, 256, 512, 1024), --type (app-icon, favicon, ui-element), --style (flat, skeuomorphic, minimal, modern), --format (png, jpeg), --background (transparent, white, black, or color name), --corners (rounded, sharp), --preview (flag)"

Otherwise, call generate_icon with the validated parameters.
`,
    },
    pattern: {
      description: 'Generate seamless patterns and textures for backgrounds and design elements.',
      prompt: `
You are a command parser for the nanobanana pattern command. You must validate arguments and return structured data.

Valid options:
- --size="WxH" (common: 128x128, 256x256, 512x512, default: 256x256)
- --type="seamless|texture|wallpaper" (default: seamless)
- --style="geometric|organic|abstract|floral|tech" (default: abstract)
- --density="sparse|medium|dense" (default: medium)
- --colors="mono|duotone|colorful" (default: colorful)
- --repeat="tile|mirror" (default: tile)
- --preview (flag)

User input: {{args}}

Parse this input and:
1. Extract the main prompt (text before any options, required)
2. Validate all options against allowed values
3. For --size, ensure format is valid (e.g., "256x256")
4. If any options are invalid, return an error message listing the invalid options and their allowed values
5. If valid, call the generate_pattern tool with the parsed parameters

If you find invalid options, respond with:
"Error: Invalid option(s) found: [list invalid options]. Valid options are: --size (format: WxH, e.g., 256x256), --type (seamless, texture, wallpaper), --style (geometric, organic, abstract, floral, tech), --density (sparse, medium, dense), --colors (mono, duotone, colorful), --repeat (tile, mirror), --preview (flag)"

Otherwise, call generate_pattern with the validated parameters.
`,
    },
    story: {
      description: 'Generate a sequence of related images that tell a visual story or show a process step-by-step.',
      prompt: `
You are a command parser for the nanobanana story command. You must validate arguments and return structured data.

Valid options:
- --steps=N (2-8, default: 4)
- --type="story|process|tutorial|timeline" (default: story)
- --style="consistent|evolving" (default: consistent)
- --layout="separate|grid|comic" (default: separate)
- --transition="smooth|dramatic|fade" (default: smooth)
- --format="storyboard|individual" (default: individual)
- --preview (flag)

User input: {{args}}

Parse this input and:
1. Extract the main prompt (text before any options, required)
2. Validate all options against allowed values
3. For --steps, ensure value is integer between 2-8
4. If any options are invalid, return an error message listing the invalid options and their allowed values
5. If valid, call the generate_story tool with the parsed parameters

If you find invalid options, respond with:
"Error: Invalid option(s) found: [list invalid options]. Valid options are: --steps (2-8), --type (story, process, tutorial, timeline), --style (consistent, evolving), --layout (separate, grid, comic), --transition (smooth, dramatic, fade), --format (storyboard, individual), --preview (flag)"

Otherwise, call generate_story with the validated parameters.
`,
    },
    diagram: {
      description: 'Generate technical diagrams, flowcharts, and architectural mockups from text descriptions.',
      prompt: `
You are a command parser for the nanobanana diagram command. You must validate arguments and return structured data.

Valid options:
- --type="flowchart|database|mindmap|architecture" (default: flowchart)
- --complexity="simple|detailed|comprehensive" (default: detailed)
- --style="professional|hand-drawn|minimal" (default: professional)
- --layout="horizontal|vertical|circular" (default: vertical)
- --format="png|svg" (default: png)
- --preview (flag)

User input: {{args}}

Parse this input and:
1. Extract the main prompt (text before any options, required)
2. Validate all options against allowed values
3. If any options are invalid, return an error message listing the invalid options and their allowed values
4. If valid, call the generate_diagram tool with the parsed parameters

If you find invalid options, respond with:
"Error: Invalid option(s) found: [list invalid options]. Valid options are: --type (flowchart, database, mindmap, architecture), --complexity (simple, detailed, comprehensive), --style (professional, hand-drawn, minimal), --layout (horizontal, vertical, circular), --format (png, svg), --preview (flag)"

Otherwise, call generate_diagram with the validated parameters.
`,
    },
    restore: {
      description: 'Restore or enhance an existing image.',
      prompt: `
You are a command parser for the nanobanana restore command. You must validate arguments and return structured data.

Valid options:
- --preview (flag)

User input: {{args}}

Parse this input and:
1. Extract the filename (first argument, required)
2. Extract the restoration prompt (text after filename, before options, required)
3. Validate all options against allowed values
4. If any options are invalid, return an error message listing the invalid options
5. If required parameters are missing, return an error message
6. If valid, call the restore_image tool with the parsed parameters

Required format: filename "restoration instructions" [--preview]

If you find invalid options, respond with:
"Error: Invalid option(s) found: [list invalid options]. Valid options are: --preview (flag)"

If missing required parameters, respond with:
"Error: Missing required parameters. Usage: /restore filename \\"restoration instructions\\" [--preview]"

Otherwise, call restore_image with file and prompt parameters.
`,
    },
    nanobanana: {
      description: 'Generate and manipulate images with Nano Banana using natural language prompts.',
      prompt: `
Please use the nanobanana MCP server tools to help with image generation and manipulation tasks based on the user's natural language request.

Analyze the user request and determine the most appropriate tool:

- For single/multiple image generation: use generate_image tool
- For editing existing images: use edit_image tool
- For restoring/enhancing images: use restore_image tool
- For app icons, favicons, UI elements: use generate_icon tool
- For seamless patterns, textures, backgrounds: use generate_pattern tool
- For visual stories, sequences, tutorials: use generate_story tool
- For technical diagrams, flowcharts, architecture: use generate_diagram tool

Be intelligent about interpreting the user's intent from their natural language description and select the most specialized tool available.

User request: {{args}}
`,
    },
  };

  private setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      try {
        const prompts = Object.entries(this.PROMPT_DEFINITIONS).map(([name, def]) => ({
          name,
          description: def.description,
          arguments: [
            {
              name: 'args',
              description: 'Command arguments and prompt',
              required: true,
            },
          ],
        }));

        return { prompts };
      } catch (error) {
        console.error('Error listing prompts:', error);
        return { prompts: [] };
      }
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const definition = this.PROMPT_DEFINITIONS[name];

      if (!definition) {
        throw new Error(`Prompt not found: ${name}`);
      }

      try {
        const userArgs = (args?.args as string) || '';

        // Support both {{args}} and {{ args }}
        const promptText = (definition.prompt || '').replace(/\{\{\s*args\s*\}\}/g, userArgs);

        return {
          description: definition.description,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: promptText,
              },
            },
          ],
        };
      } catch (error) {
        console.error(`Error getting prompt ${name}:`, error);
        throw new Error(`Failed to load prompt ${name}`);
      }
    });
  }

  private buildIconPrompt(args?: IconPromptArgs): string {
    const basePrompt = args?.prompt || 'app icon';
    const type = args?.type || 'app-icon';
    const style = args?.style || 'modern';
    const background = args?.background || 'transparent';
    const corners = args?.corners || 'rounded';

    let prompt = `${basePrompt}, ${style} style ${type}`;

    if (type === 'app-icon') {
      prompt += `, ${corners} corners`;
    }

    if (background !== 'transparent') {
      prompt += `, ${background} background`;
    }

    prompt += ', clean design, high quality, professional';

    return prompt;
  }

  private buildPatternPrompt(args?: PatternPromptArgs): string {
    const basePrompt = args?.prompt || 'abstract pattern';
    const type = args?.type || 'seamless';
    const style = args?.style || 'abstract';
    const density = args?.density || 'medium';
    const colors = args?.colors || 'colorful';
    const size = args?.size || '256x256';

    let prompt = `${basePrompt}, ${style} style ${type} pattern, ${density} density, ${colors} colors`;

    if (type === 'seamless') {
      prompt += ', tileable, repeating pattern';
    }

    prompt += `, ${size} tile size, high quality`;

    return prompt;
  }

  private buildDiagramPrompt(args?: DiagramPromptArgs): string {
    const basePrompt = args?.prompt || 'system diagram';
    const type = args?.type || 'flowchart';
    const style = args?.style || 'professional';
    const layout = args?.layout || 'hierarchical';
    const complexity = args?.complexity || 'detailed';
    const colors = args?.colors || 'accent';
    const annotations = args?.annotations || 'detailed';

    let prompt = `${basePrompt}, ${type} diagram, ${style} style, ${layout} layout`;
    prompt += `, ${complexity} level of detail, ${colors} color scheme`;
    prompt += `, ${annotations} annotations and labels`;
    prompt += ', clean technical illustration, clear visual hierarchy';

    return prompt;
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transportType = process.env.TRANSPORT || 'stdio';

    if (transportType === 'sse') {
      const app = express();

      // Add body parsing middleware for POST requests
      app.use(express.json());

      // Use Map to manage multiple transport instances for concurrent connections
      const transports = new Map<string, SSEServerTransport>();

      app.get('/health', (req, res) => {
        res.status(200).send('OK');
      });

      app.get('/sse', async (req: express.Request, res: express.Response) => {
        console.error('New SSE connection');
        const transport = new SSEServerTransport('/messages', res);

        // Store transport by sessionId for routing
        transports.set(transport.sessionId, transport);
        console.error(`SSE session created: ${transport.sessionId}`);

        // Clean up transport when connection closes
        res.on('close', () => {
          transports.delete(transport.sessionId);
          console.error(`SSE connection closed: ${transport.sessionId}`);
        });

        try {
          await this.server.connect(transport);
        } catch (error) {
          console.error(`Failed to connect transport for session ${transport.sessionId}:`, error);
          transports.delete(transport.sessionId);
          if (!res.headersSent) {
            res.status(500).end();
          }
        }
      });

      app.post('/messages', async (req: express.Request, res: express.Response) => {
        // Get sessionId from query parameter (sent by MCP client)
        const sessionId = req.query.sessionId as string;

        if (!sessionId) {
          res.status(400).json({ error: 'Missing sessionId parameter' });
          return;
        }

        const transport = transports.get(sessionId);

        if (!transport) {
          res.status(404).json({ error: 'Session not found' });
          return;
        }

        try {
          // Pass parsed body to handlePostMessage
          await transport.handlePostMessage(req, res, req.body);
        } catch (error) {
          console.error(`Error handling message for session ${sessionId}:`, error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
          }
        }
      });

      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.error(`Nano Banana MCP server running on SSE at http://localhost:${port}`);
        console.error(`SSE endpoint: http://localhost:${port}/sse`);
        console.error(`Message endpoint: http://localhost:${port}/messages`);
      });
    } else {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Nano Banana MCP server running on stdio');
    }
  }
}

const server = new NanoBananaServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
