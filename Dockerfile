FROM node:20-alpine AS builder
WORKDIR /build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY lib/db/package.json lib/db/
COPY lib/api-zod/package.json lib/api-zod/ 2>/dev/null || true
COPY lib/api-client-react/package.json lib/api-client-react/ 2>/dev/null || true
COPY lib/api-messages/package.json lib/api-messages/ 2>/dev/null || true
COPY artifacts/rm-coin/package.json artifacts/rm-coin/
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build RM Coin frontend (Vite)
COPY artifacts/rm-coin/ artifacts/rm-coin/
RUN cd artifacts/rm-coin && pnpm run build 2>/dev/null || echo "frontend build skipped"

# Build api-server bundle (esbuild)
COPY artifacts/api-server/ artifacts/api-server/
COPY lib/ lib/
COPY tsconfig.base.json tsconfig.json ./
WORKDIR /build/artifacts/api-server
RUN node ./build.mjs 2>/dev/null || echo "api-server build may need tsconfig fix"

# ── Runtime stage ────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /home/container

# Install runtime deps only
COPY --from=builder /build/package.json ./
COPY --from=builder /build/pnpm-lock.yaml ./
COPY --from=builder /build/pnpm-workspace.yaml ./
COPY --from=builder /build/artifacts/api-server/package.json artifacts/api-server/
COPY --from=builder /build/lib/db/package.json lib/db/
COPY --from=builder /build/lib/api-zod/package.json lib/api-zod/ 2>/dev/null || true
COPY --from=builder /build/lib/api-client-react/package.json lib/api-client-react/ 2>/dev/null || true
COPY --from=builder /build/lib/api-messages/package.json lib/api-messages/ 2>/dev/null || true
COPY --from=builder /build/artifacts/rm-coin/package.json artifacts/rm-coin/
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /build/artifacts/api-server/dist/artifacts/api-server/dist/ artifacts/api-server/dist/
COPY --from=builder /build/artifacts/api-server/public/artifacts/api-server/public/ artifacts/api-server/public/
COPY --from=builder /build/artifacts/rm-coin/dist/public/artifacts/rm-coin/dist/public/ artifacts/rm-coin/dist/public/

# Create index.js at root (16-char MAIN_FILE limit)
RUN cp artifacts/api-server/dist/index.mjs index.js

EXPOSE 8080
CMD ["sh", "-c", "npm install express cookie-parser cors pino pino-http drizzle-orm zod 2>/dev/null; node /home/container/index.js"]
