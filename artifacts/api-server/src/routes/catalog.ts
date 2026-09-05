import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, rmModelsTable, rmModelPostsTable } from "@workspace/db";

const router: IRouter = Router();

type CatalogModel = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  location: string;
  revealCostLp: number;
  rmCost: number;
  tags: string[];
  avatar: string;
  cover: string;
  accent: string;
  posts: { id: string; type: "image"; image: string; caption: string }[];
};

/** Map a DB model + its posts into the app's ModelProfile shape. */
function toCatalogModel(model: typeof rmModelsTable.$inferSelect, posts: typeof rmModelPostsTable.$inferSelect[]): CatalogModel {
  return {
    id: model.slug,
    name: model.name,
    handle: model.username,
    bio: model.bio,
    location: model.location,
    revealCostLp: model.revealCostLp,
    rmCost: model.rmCost,
    tags: model.tags,
    avatar: model.avatarUrl,
    cover: model.coverUrl,
    accent: model.accent,
    posts: posts.map((p) => ({ id: p.id, type: "image" as const, image: p.imageUrl, caption: p.caption })),
  };
}

// GET /catalog/models — dynamic (DB) models only. The RM app merges these
// with its own static MODEL_PROFILES so admin-created models appear alongside
// the built-in ones.
router.get("/models", async (_req, res): Promise<void> => {
  try {
    const dbModels = await db.select().from(rmModelsTable).orderBy(desc(rmModelsTable.createdAt));
    const catalog: CatalogModel[] = [];
    for (const m of dbModels) {
      const posts = await db.select().from(rmModelPostsTable).where(eq(rmModelPostsTable.modelId, m.id)).orderBy(rmModelPostsTable.sortOrder);
      catalog.push(toCatalogModel(m, posts));
    }
    res.json(catalog);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /catalog/models/:slug/posts — posts for a single (DB) model.
router.get("/models/:slug/posts", async (req, res): Promise<void> => {
  try {
    const [model] = await db.select().from(rmModelsTable).where(eq(rmModelsTable.slug, String(req.params.slug)));
    if (!model) {
      res.status(404).json({ error: "Model not found" });
      return;
    }
    const posts = await db.select().from(rmModelPostsTable).where(eq(rmModelPostsTable.modelId, model.id)).orderBy(rmModelPostsTable.sortOrder);
    res.json(posts.map((p) => ({ id: p.id, image: p.imageUrl, caption: p.caption })));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
