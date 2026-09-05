FROM node:20-alpine
WORKDIR /home/container
COPY . .
RUN npm install express cookie-parser cors pino pino-http drizzle-orm zod pg
RUN cp artifacts/api-server/dist/index.mjs index.js
EXPOSE 8080
CMD ["node", "index.js"]

ENV NODE_ENV=production
ENV PORT=8080
ENV DIRECT_URL=postgresql://postgres.isnjwbqknwcxujmruqel:info52305344@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
ENV DATABASE_URL=postgresql://postgres.isnjwbqknwcxujmruqel:info52305344@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
ENV SESSION_SECRET=rm-coin-local-dev-secret-7f3a9c21e8b40d6a
ENV TELEGRAM_BOT_TOKEN=8720448254:AAHAKDwkiywKUtfC6UbpbMWDINSMmiUKyqo
ENV TELEGRAM_WEBAPP_URL=https://r-o5l3s-23178.justrunmy.app
ENV TELEGRAM_WEBHOOK_URL=https://r-o5l3s-23178.justrunmy.app/api/telegram/webhook
ENV SUPABASE_URL=https://isnjwbqknwcxujmruqel.supabase.co
ENV SUPABASE_PUBLISHABLE_KEY=sb_publishable_fMROtm_ERHaz0ghO5sPVBg_gZtCq7W3
ENV SUPABASE_SECRET_KEY=sb_secret_ARHWZYtid-vX_GtiqswMLw_OxIsjiRS
ENV SUPABASE_JWKS_URL=https://isnjwbqknwcxujmruqel.supabase.co/auth/v1/.well-known/jwks.json
ENV VITE_MONETAG_ZONE_ID=11553658
ENV ZEROSTORAGE_API_KEY=sk_DJT3fsgBJJLt_3ufQnePBCq657Nx1YtC
ENV ZEROSTORAGE_BASE_URL=https://test.zerostorage.net/api
ENV ADMIN_USERNAME=joker026
ENV ADMIN_PASSWORD=Info52305344
