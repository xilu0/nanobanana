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
RUN npm ci --omit=dev --ignore-scripts

# Copy built files from builder stage
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist

# Copy commands for prompts support
# The server logic expects commands at ../../commands relative to /app/mcp-server/dist/index.js
# path.resolve('/app/mcp-server/dist', '../../commands') -> /app/commands
COPY --from=builder /app/commands /app/commands

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
# Path: /app/mcp-server/dist/index.js
# commandsDir: path.resolve('/app/mcp-server/dist', '../../commands') -> /app/commands
CMD ["node", "mcp-server/dist/index.js"]
