// Thin client for the server-authoritative social endpoints on the api-server.
//
// The social/full aggregate (`GET /social`) and every state-changing mutation
// are owned by the backend. The client NEVER sends balances or computed
// values — it only sends intent (modelId, postId, flag, itemId). The server
// validates against its own catalogue and performs the work in a transaction.
//
// When no backend session exists (bare-browser / preview), these calls 404 and
// the `useSocialState` hook falls back to local-only behaviour.

const BASE = "/api/social";

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export type SocialData = {
  starterIds: string[];
  unlockedIds: string[];
  revealProgress: Record<string, number>;
  lpBalance: number;
  followingIds: string[];
  likedPostIds: string[];
  hotPostIds: string[];
  savedPostIds: string[];
  unlockedPostIds: string[];
  followedStyles: string[];
  muted: boolean;
  viewCounts: Record<string, number>;
  ownedMiners: string[];
  ownedSkins: string[];
  equippedMiner: string | null;
  equippedSkin: string | null;
  modelTickets: number;
  shotTickets: number;
  bonusMineMinutes: number;
  lastWheelSpin: string | null;
  earnedSpins: number;
  adsWatchedForSpin: number;
};

export async function fetchSocialProfile(): Promise<SocialData> {
  const res = await fetch(`${BASE}`, { method: "GET", credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load social profile (${res.status})`);
  const json = (await res.json()) as { data: SocialData };
  return json.data;
}

export const socialApi = {
  revealTap: (modelId: string) => post<{ data: SocialData }>("/reveal/tap", { modelId }),
  revealUnlock: (modelId: string) => post<{ data: SocialData }>("/reveal/unlock", { modelId }),
  revealTicket: (modelId: string) => post<{ data: SocialData }>("/reveal/ticket", { modelId }),
  useShotTicket: (modelId: string, postId: string) => post<{ data: SocialData }>("/tickets/shot", { modelId, postId }),
  follow: (modelId: string) => post<{ data: SocialData }>("/follow", { modelId }),
  post: (postId: string, flag: "liked" | "saved" | "hot", value: boolean) =>
    post<{ data: SocialData }>("/post", { postId, flag, value }),
  view: (postId: string) => post<{ data: SocialData }>("/view", { postId }),
  followStyle: (styleId: string) => post<{ data: SocialData }>("/follow-style", { styleId }),
  mute: (value: boolean) => post<{ data: SocialData }>("/mute", { value }),
  wheelSpin: () => post<{ prize: unknown; data: SocialData }>("/wheel/spin", {}),
  adIntent: () => post<{ data: SocialData }>("/ads/intent", {}),
  purchase: (itemId: string) => post<{ data: SocialData }>("/purchase", { itemId }),
  equip: (itemId: string) => post<{ data: SocialData }>("/equip", { itemId }),
};
