import { useEffect, useState } from "react";
import { MODEL_PROFILES, type ModelProfile } from "../lib/social-data";

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

function toModelProfile(m: CatalogModel): ModelProfile {
  return {
    id: m.id,
    name: m.name,
    handle: m.handle,
    bio: m.bio,
    location: m.location,
    followers: 0,
    revealCostLp: m.revealCostLp,
    rmCost: m.rmCost,
    tags: m.tags,
    avatar: m.avatar,
    cover: m.cover,
    accent: m.accent,
    posts: m.posts.map((p) => ({ id: p.id, type: "image" as const, image: p.image, caption: p.caption, likes: 0, posted: "just now" })),
  };
}

/**
 * Returns the merged model catalog: the built-in static MODEL_PROFILES plus
 * any models created through the admin panel (served from the DB via
 * /catalog/models). Admin-created models override a same-slug static model.
 */
export function useCatalog(): { models: ModelProfile[]; loading: boolean; refresh: () => void } {
  const [models, setModels] = useState<ModelProfile[]>(MODEL_PROFILES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/catalog/models", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CatalogModel[]) => {
        if (cancelled) return;
        const dynamic = (data || []).map(toModelProfile);
        const staticIds = new Set(MODEL_PROFILES.map((m) => m.id));
        const merged = [...dynamic.filter((m) => !staticIds.has(m.id)), ...MODEL_PROFILES];
        setModels(merged);
      })
      .catch(() => {
        if (!cancelled) setModels(MODEL_PROFILES);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { models, loading, refresh: () => setModels(MODEL_PROFILES) };
}

/**
 * Resolves a single model profile by id. Returns the static model immediately
 * when present; otherwise fetches the admin catalog (DB-backed models) so that
 * models created in the admin panel render on their detail / reveal pages.
 */
export function useModelProfile(id: string | undefined): { model: ModelProfile | undefined; loading: boolean } {
  const staticModel = id ? MODEL_PROFILES.find((m) => m.id === id) : undefined;
  const [model, setModel] = useState<ModelProfile | undefined>(staticModel);
  const [loading, setLoading] = useState(!staticModel && Boolean(id));

  useEffect(() => {
    if (staticModel) {
      setModel(staticModel);
      setLoading(false);
      return;
    }
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/catalog/models", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CatalogModel[]) => {
        if (cancelled) return;
        const found = (data || []).find((m) => m.id === id);
        if (found) setModel(toModelProfile(found));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, staticModel]);

  return { model, loading };
}
