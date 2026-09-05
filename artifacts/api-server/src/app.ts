import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import cookieParser from "cookie-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Admin SPA (outside the Mini App) — served at /admin.
// Point at the SOURCE public/ dir (the esbuild build does not copy static
// assets into dist/), resolved from this file's location (dist/) → ../public.
const publicDir = path.join(__dirname, "..", "public");
app.use("/admin", express.static(path.join(publicDir, "admin"), { index: ["index.html"] }));

// RM Coin Mini App SPA — served at / so a single ngrok tunnel (pointed at
// this server) hosts the app, the admin panel, and the API together.
// Resolved from dist/ (api-server/dist) → ../../rm-coin/dist/public.
const spaDir = path.join(__dirname, "..", "..", "rm-coin", "dist", "public");
app.use(express.static(spaDir, { index: ["index.html"] }));

app.use("/api", router);

// SPA client-side routing fallback: any non-/api, non-/admin GET that didn't
// match a static file returns index.html (wouter handles the route client-side).
app.get(/^(?!\/api|\/admin).*/, (_req, res) => {
  res.sendFile(path.join(spaDir, "index.html"));
});

export default app;
