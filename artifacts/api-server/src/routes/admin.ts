import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, rmModelsTable, rmModelPostsTable } from "@workspace/db";
import { requireAdmin, createAdminCookie, verifyAdminCredentials, isSecureRequest } from "../middlewares/admin-auth";
import { zsImageUrl, listFolders, listFiles, createFolder, uploadFile, uploadBuffer, fetchBuffer, ZEROSTORAGE_ROOT_FOLDER } from "../lib/zerostorage";

const router: IRouter = Router();

// Resolve the 0RMCOIN root folder id once (cached for the process lifetime).
let rootFolderId: string | null = null;
async function getRootFolderId(): Promise<string> {
  if (rootFolderId) return rootFolderId;
  const folders = await listFolders();
  const root = folders.find((f) => f.name === ZEROSTORAGE_ROOT_FOLDER);
  if (!root) throw new Error(`ZeroStorage root folder "${ZEROSTORAGE_ROOT_FOLDER}" not found`);
  rootFolderId = root.id;
  return rootFolderId;
}

// ---- Auth ----
router.post("/login", (req, res): void => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !verifyAdminCredentials(username, password)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  res.setHeader("Set-Cookie", createAdminCookie(isSecureRequest(req)));
  res.json({ ok: true });
});

router.post("/logout", (req, res): void => {
  res.clearCookie("rm_admin_session");
  res.json({ ok: true });
});

// ---- ZeroStorage proxy (admin-only) ----
router.get("/zs/folders", requireAdmin, async (req, res): Promise<void> => {
  try {
    const parentId = typeof req.query.parentId === "string" ? req.query.parentId : undefined;
    res.json(await listFolders(parentId));
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

router.get("/zs/root-folder", requireAdmin, async (_req, res): Promise<void> => {
  try {
    res.json({ id: await getRootFolderId(), name: ZEROSTORAGE_ROOT_FOLDER });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

router.get("/zs/files", requireAdmin, async (req, res): Promise<void> => {
  const folderId = typeof req.query.folderId === "string" ? req.query.folderId : "";
  if (!folderId) {
    res.status(400).json({ error: "folderId required" });
    return;
  }
  try {
    const files = await listFiles(folderId);
    res.json(files.map((f) => ({ id: f.id, filename: f.filename, title: f.title, fileType: f.fileType, thumb: f.thumbnailUrl, url: f.imageUrl })));
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// ---- Models ----
router.get("/models", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const models = await db.select().from(rmModelsTable).orderBy(desc(rmModelsTable.createdAt));
    res.json(models);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/models", requireAdmin, async (req, res): Promise<void> => {
  try {
    const b = req.body ?? {};
    const slug = String(b.slug || "").trim();
    const name = String(b.name || "").trim();
    if (!slug || !name || !/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({ error: "A valid lowercase slug (a-z0-9-) and name are required" });
      return;
    }
    const accent = String(b.accent || "#ffbd7d");
    const tags = Array.isArray(b.tags) ? b.tags.map((t: unknown) => String(t)).filter(Boolean).slice(0, 10) : [];
    const [model] = await db
      .insert(rmModelsTable)
      .values({
        slug,
        name,
        username: String(b.username || `@${slug}`),
        bio: String(b.bio || ""),
        location: String(b.location || ""),
        avatarUrl: String(b.avatarUrl || ""),
        coverUrl: String(b.coverUrl || ""),
        accent,
        revealCostLp: Number(b.revealCostLp) || 30,
        rmCost: Number(b.rmCost) || 2.5,
        tags,
      })
      .returning();
    res.json(model);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Upload an avatar/cover image (file or URL) into the model's ZeroStorage folder.
async function resolveImage(field: "avatarUrl" | "coverUrl", source: unknown, rootId: string, slug: string): Promise<string> {
  if (typeof source !== "string" || !source) return "";
  // If it's already a ZeroStorage download URL, keep it.
  if (source.includes("/api/files/download/") || source.startsWith("http")) {
    // A direct URL: if it's already a zerostorage download link, reuse; otherwise fetch+reupload.
    if (source.includes("zerostorage.net/api/files/download/")) return source;
    const buf = await fetchBuffer(source);
    const folder = await createFolder(slug, rootId);
    const { fileId } = await uploadBuffer(buf, `${field}.jpg`, folder.id);
    return zsImageUrl(fileId);
  }
  return "";
}

router.post("/models/with-upload", requireAdmin, async (req, res): Promise<void> => {
  try {
    const b = req.body ?? {};
    // Accept base64 data URLs for avatar/cover from the admin SPA.
    const rootId = await (async () => {
      const folders = await listFolders();
      return folders.find((f) => f.name === ZEROSTORAGE_ROOT_FOLDER)!.id;
    })();
    const slug = String(b.slug || "").trim();
    const name = String(b.name || "").trim();
    if (!slug || !name) {
      res.status(400).json({ error: "slug and name are required" });
      return;
    }
    const folder = await createFolder(slug, rootId);
    const avatarUrl = b.avatarData ? zsImageUrl((await uploadBuffer(Buffer.from(b.avatarData.split(",")[1], "base64"), "avatar.jpg", folder.id)).fileId) : String(b.avatarUrl || "");
    const coverUrl = b.coverData ? zsImageUrl((await uploadBuffer(Buffer.from(b.coverData.split(",")[1], "base64"), "cover.jpg", folder.id)).fileId) : String(b.coverUrl || "");
    const tags = Array.isArray(b.tags) ? b.tags.map((t: unknown) => String(t)).filter(Boolean).slice(0, 10) : [];
    const [model] = await db
      .insert(rmModelsTable)
      .values({
        slug,
        name,
        username: String(b.username || `@${slug}`),
        bio: String(b.bio || ""),
        location: String(b.location || ""),
        avatarUrl,
        coverUrl,
        accent: String(b.accent || "#ffbd7d"),
        revealCostLp: Number(b.revealCostLp) || 30,
        rmCost: Number(b.rmCost) || 2.5,
        tags,
      })
      .returning();
    res.json(model);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Update an existing model (all fields editable). Reuses the same avatar/cover
// resolution as create: base64 → upload to ZeroStorage, otherwise keep the
// provided URL (including an existing zerostorage link).
router.put("/models/:slug", requireAdmin, async (req, res): Promise<void> => {
  try {
    const slug = String(req.params.slug);
    const [existing] = await db.select().from(rmModelsTable).where(eq(rmModelsTable.slug, slug));
    if (!existing) {
      res.status(404).json({ error: "Model not found" });
      return;
    }
    const b = req.body ?? {};
    const rootId = await (async () => {
      const folders = await listFolders();
      return folders.find((f) => f.name === ZEROSTORAGE_ROOT_FOLDER)!.id;
    })();
    const name = String(b.name || "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const folder = await createFolder(slug, rootId);
    const avatarUrl = b.avatarData ? zsImageUrl((await uploadBuffer(Buffer.from(b.avatarData.split(",")[1], "base64"), "avatar.jpg", folder.id)).fileId) : String(b.avatarUrl ?? existing.avatarUrl ?? "");
    const coverUrl = b.coverData ? zsImageUrl((await uploadBuffer(Buffer.from(b.coverData.split(",")[1], "base64"), "cover.jpg", folder.id)).fileId) : String(b.coverUrl ?? existing.coverUrl ?? "");
    const tags = Array.isArray(b.tags) ? b.tags.map((t: unknown) => String(t)).filter(Boolean).slice(0, 10) : [];
    const [model] = await db
      .update(rmModelsTable)
      .set({
        name,
        username: String(b.username ?? existing.username ?? `@${slug}`),
        bio: String(b.bio ?? existing.bio ?? ""),
        location: String(b.location ?? existing.location ?? ""),
        avatarUrl,
        coverUrl,
        accent: String(b.accent ?? existing.accent ?? "#ffbd7d"),
        revealCostLp: Number(b.revealCostLp) || existing.revealCostLp || 30,
        rmCost: Number(b.rmCost) || existing.rmCost || 2.5,
        tags,
      })
      .where(eq(rmModelsTable.slug, slug))
      .returning();
    res.json(model);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.delete("/models/:slug", requireAdmin, async (req, res): Promise<void> => {
  try {
    const [target] = await db.select({ id: rmModelsTable.id }).from(rmModelsTable).where(eq(rmModelsTable.slug, String(req.params.slug)));
    if (!target) {
      res.status(404).json({ error: "Model not found" });
      return;
    }
    await db.delete(rmModelPostsTable).where(eq(rmModelPostsTable.modelId, target.id));
    const deleted = await db.delete(rmModelsTable).where(eq(rmModelsTable.slug, String(req.params.slug))).returning();
    res.json({ ok: Boolean(deleted.length) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ---- Posts ----
router.get("/models/:slug/posts", requireAdmin, async (req, res): Promise<void> => {
  try {
    const [model] = await db.select().from(rmModelsTable).where(eq(rmModelsTable.slug, String(req.params.slug)));
    if (!model) {
      res.status(404).json({ error: "Model not found" });
      return;
    }
    const posts = await db.select().from(rmModelPostsTable).where(eq(rmModelPostsTable.modelId, model.id)).orderBy(rmModelPostsTable.sortOrder);
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Attach selected ZeroStorage files as posts to a model.
// Accepts: fileIds[] (required), caption (string applied to all posts),
// and/or captions ({ [fileId]: string }) for per-file overrides.
router.post("/models/:slug/posts", requireAdmin, async (req, res): Promise<void> => {
  try {
    const [model] = await db.select().from(rmModelsTable).where(eq(rmModelsTable.slug, String(req.params.slug)));
    if (!model) {
      res.status(404).json({ error: "Model not found" });
      return;
    }
    const fileIds: string[] = Array.isArray(req.body?.fileIds) ? req.body.fileIds.map((x: unknown) => String(x)) : [];
    if (!fileIds.length) {
      res.status(400).json({ error: "fileIds required" });
      return;
    }
    const allCaption = typeof req.body?.caption === "string" ? req.body.caption : "";
    const perFile: Record<string, string> = req.body?.captions && typeof req.body.captions === "object" ? req.body.captions : {};
    const existing = await db.select({ c: rmModelPostsTable.id }).from(rmModelPostsTable).where(eq(rmModelPostsTable.modelId, model.id));
    const nextOrder = existing.length;
    const rows = fileIds.map((fileId, i) => ({
      modelId: model.id,
      imageUrl: zsImageUrl(fileId),
      fileId,
      caption: String(perFile[fileId] ?? allCaption ?? ""),
      sortOrder: nextOrder + i,
    }));
    const inserted = await db.insert(rmModelPostsTable).values(rows).returning();
    res.json(inserted);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
