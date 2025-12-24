# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Copy mcp-server package files
COPY mcp-server/package*.json ./mcp-server/

# Install all dependencies for the server, ignoring scripts to avoid premature build
WORKDIR /app/mcp-server
RUN npm ci --ignore-scripts

# Copy the rest of the repository source code (excluding what's in .dockerignore)
WORKDIR /app
COPY . .

# Build TypeScript code explicitly after source code is copied
WORKDIR /app/mcp-server
RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy package files
COPY mcp-server/package*.json ./mcp-server/

# Install only production dependencies
WORKDIR /app/mcp-server
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist

# Copy commands for prompts support
# The server logic expects commands at ../../commands relative to dist/index.js
COPY --from=builder /app/commands /commands

# Create a directory for image outputs
RUN mkdir -p outputs && chmod 777 outputs

# Set environment variables
ENV TRANSPORT=sse
ENV PORT=3000
ENV NODE_ENV=production
ENV NANOBANANA_BASE_URL=

# Expose the port
EXPOSE 3000

# Start the server
# Path matches the structure: /app/mcp-server/dist/index.js
# commandsDir in index.ts: path.resolve(__dirname, '../../commands') -> /commands
CMD ["node", "mcp-server/dist/index.js"]
