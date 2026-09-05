FROM node:20-alpine
WORKDIR /home/container
COPY . .
RUN npm install express cookie-parser cors pino pino-http drizzle-orm zod pg
RUN cp artifacts/api-server/dist/index.mjs index.js
EXPOSE 8080
CMD ["node", "index.js"]
