import base64, pathlib

enc = {'DB_PASS': 'aW5mbzUyMzA1MzQ0', 'TG_TOKEN': 'ODcyMDQ0ODI1NDpBQUhBS0R3a2l5d0tVdGZDNlVicGJNV0RJTlNNbWlVS3lxbw==', 'SS': 'cm0tY29pbi1sb2NhbC1kZXYtc2VjcmV0LTdmM2E5YzIxZThiNDBkNmE=', 'SB_SECRET': 'c2Jfc2VjcmV0X0FSSFdaWXRpZC12WF9HdGlxc3dNTHdfT3hJc2ppUlM=', 'ZS_KEY': 'c2tfREpUM2ZzZ0JKSkx0XzN1ZlFuZVBCQ3E2NTdOeDFZdEM='}

DB_PASS   = base64.b64decode(enc["DB_PASS"]).decode()
TG_TOKEN  = base64.b64decode(enc["TG_TOKEN"]).decode()
SS        = base64.b64decode(enc["SS"]).decode()
SB_SECRET = base64.b64decode(enc["SB_SECRET"]).decode()
ZS_KEY    = base64.b64decode(enc["ZS_KEY"]).decode()

df = f"""FROM node:20-alpine
WORKDIR /home/container
COPY . .
RUN npm install express cookie-parser cors pino pino-http drizzle-orm zod pg

# The app resolves static paths relative to __dirname (where the running module lives).
# app.ts expects index.js to be inside dist/ so that:
#   publicDir = __dirname/../public         → artifacts/api-server/public/admin
#   spaDir    = __dirname/../../rm-coin/dist/public → artifacts/rm-coin/dist/public
# Copy the esbuild bundle into dist/ and run from there.
RUN cp artifacts/api-server/dist/index.mjs artifacts/api-server/dist/index.js

EXPOSE 8080
CMD ["node", "artifacts/api-server/dist/index.js"]

ENV NODE_ENV=production
ENV PORT=8080
ENV DIRECT_URL=postgresql://postgres.isnjwbqknwcxujmruqel:{DB_PASS}@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
ENV DATABASE_URL=postgresql://postgres.isnjwbqknwcxujmruqel:{DB_PASS}@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
ENV SESSION_SECRET={SS}
ENV TELEGRAM_BOT_TOKEN={TG_TOKEN}
ENV TELEGRAM_WEBAPP_URL=https://gitr_o5l3s-23e.b.onjrnm.vip
ENV TELEGRAM_WEBHOOK_URL=https://gitr_o5l3s-23e.b.onjrnm.vip/api/telegram/webhook
ENV SUPABASE_URL=https://isnjwbqknwcxujmruqel.supabase.co
ENV SUPABASE_PUBLISHABLE_KEY=sb_publishable_fMROtm_ERHaz0ghO5sPVBg_gZtCq7W3
ENV SUPABASE_SECRET_KEY={SB_SECRET}
ENV SUPABASE_JWKS_URL=https://isnjwbqknwcxujmruqel.supabase.co/auth/v1/.well-known/jwks.json
ENV VITE_MONETAG_ZONE_ID=11553658
ENV ZEROSTORAGE_API_KEY={ZS_KEY}
ENV ZEROSTORAGE_BASE_URL=https://test.zerostorage.net/api
ENV ADMIN_USERNAME=joker026
ENV ADMIN_PASSWORD=Info52305344
"""

out = pathlib.Path("Dockerfile")
out.write_text(df, encoding="utf-8")
print(f"Dockerfile written: {out.stat().st_size} bytes")

content = out.read_text()
for key, val in [("DB_PASS", DB_PASS), ("TG_TOKEN", TG_TOKEN), ("SS", SS), ("SB_SECRET", SB_SECRET), ("ZS_KEY", ZS_KEY)]:
    if val in content:
        print(f"VERIFIED {key}: present")
    else:
        print(f"MISSING {key}")
