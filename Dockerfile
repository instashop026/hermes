FROM node:22-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/db/package.json lib/db/

# Install pnpm, approve esbuild, then install dependencies
RUN npm install -g pnpm && pnpm approve-builds esbuild && pnpm install

# Copy all source
COPY . .

# Allow esbuild build scripts, then build the api-server directly
RUN pnpm approve-builds esbuild && pnpm --filter @workspace/api-server run build

# Expose port (blitz.cloud sets PORT env var, app reads it)
EXPOSE 8080

# Start the API server
CMD ["pnpm", "run", "start"]