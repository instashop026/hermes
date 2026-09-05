import { useCallback, useEffect, useRef, useState } from 'react';
import { MODEL_PROFILES, REVEAL_PANELS, revealLpPerTap, type ModelProfile } from '@/lib/social-data';
import { isOfflineMode } from '@/lib/offline';
import {
  fetchSocialProfile,
  socialApi,
  type SocialData,
} from '@/lib/social-api';

const STORAGE_KEY = 'rm-coin-social-prototype-v2';

/**
 * Client-side view model. Fields the server owns are hydrated/refreshed from
 * the backend; rendering never trusts locally-computed balances because the
 * server is the source of truth and returns the canonical aggregate.
 */
export type SocialState = {
  starterIds: string[];
  unlockedIds: string[];
  revealProgress: Record<string, number>;
  lpBalance: number;
  /** RM Coin balance is owned by the server (miner/balance), surfaced read-only here. */
  rmSpent: number;
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
  rmBalance: number;
  lastWheelSpin: number;
  earnedSpins: number;
  adsWatchedForSpin: number;
};

const starterAssignment = () => [...MODEL_PROFILES].sort(() => Math.random() - 0.5).slice(0, 5).map((model) => model.id);

const initialState = (): SocialState => ({
  starterIds: starterAssignment(),
  unlockedIds: [],
  revealProgress: {},
  lpBalance: 24,
  rmSpent: 0,
  followingIds: [],
  likedPostIds: [],
  hotPostIds: [],
  savedPostIds: [],
  unlockedPostIds: [],
  followedStyles: [],
  muted: false,
  viewCounts: {},
  ownedMiners: [],
  ownedSkins: [],
  equippedMiner: null,
  equippedSkin: null,
  modelTickets: 0,
  shotTickets: 0,
  bonusMineMinutes: 0,
  rmBalance: 0,
  lastWheelSpin: 0,
  earnedSpins: 0,
  adsWatchedForSpin: 0,
});

/** Map the server aggregate into the client view model. */
const toClientState = (d: SocialData): SocialState => ({
  starterIds: d.starterIds,
  unlockedIds: d.unlockedIds,
  revealProgress: d.revealProgress,
  lpBalance: d.lpBalance,
  rmSpent: 0,
  followingIds: d.followingIds,
  likedPostIds: d.likedPostIds,
  hotPostIds: d.hotPostIds,
  savedPostIds: d.savedPostIds,
  unlockedPostIds: d.unlockedPostIds ?? [],
  followedStyles: d.followedStyles,
  muted: d.muted,
  viewCounts: d.viewCounts,
  ownedMiners: d.ownedMiners,
  ownedSkins: d.ownedSkins,
  equippedMiner: d.equippedMiner,
  equippedSkin: d.equippedSkin,
  modelTickets: d.modelTickets,
  shotTickets: d.shotTickets,
  bonusMineMinutes: d.bonusMineMinutes,
  rmBalance: 0,
  lastWheelSpin: d.lastWheelSpin ? new Date(d.lastWheelSpin).getTime() : 0,
  earnedSpins: d.earnedSpins,
  adsWatchedForSpin: d.adsWatchedForSpin,
});

const validateState = (parsed: Partial<SocialState> | null | undefined): SocialState => {
  const defaults = initialState();
  if (!parsed || typeof parsed !== 'object') return defaults;
  // Starters are always built-in static models, so validate them against the
  // static catalog. But unlock/follow ids are server-authoritative and may
  // include admin-created (DB) models — accept any string id the server sent.
  const staticIds = new Set(MODEL_PROFILES.map((model) => model.id));
  const starters = Array.isArray(parsed.starterIds) ? parsed.starterIds.filter((id): id is string => typeof id === 'string' && staticIds.has(id)).slice(0, 5) : [];
  return {
    ...defaults,
    ...parsed,
    starterIds: starters.length === 5 ? starters : defaults.starterIds,
    unlockedIds: Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds.filter((id): id is string => typeof id === 'string') : [],
    followingIds: Array.isArray(parsed.followingIds) ? parsed.followingIds.filter((id): id is string => typeof id === 'string') : [],
    likedPostIds: Array.isArray(parsed.likedPostIds) ? parsed.likedPostIds : [],
    hotPostIds: Array.isArray(parsed.hotPostIds) ? parsed.hotPostIds : [],
    savedPostIds: Array.isArray(parsed.savedPostIds) ? parsed.savedPostIds : [],
    unlockedPostIds: Array.isArray(parsed.unlockedPostIds) ? parsed.unlockedPostIds : [],
    followedStyles: Array.isArray(parsed.followedStyles) ? parsed.followedStyles : [],
    muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
    viewCounts: parsed.viewCounts && typeof parsed.viewCounts === 'object' ? parsed.viewCounts : {},
    ownedMiners: Array.isArray(parsed.ownedMiners) ? parsed.ownedMiners : [],
    ownedSkins: Array.isArray(parsed.ownedSkins) ? parsed.ownedSkins : [],
    modelTickets: typeof parsed.modelTickets === 'number' ? parsed.modelTickets : 0,
    shotTickets: typeof parsed.shotTickets === 'number' ? parsed.shotTickets : 0,
    bonusMineMinutes: typeof parsed.bonusMineMinutes === 'number' ? parsed.bonusMineMinutes : 0,
    lastWheelSpin: typeof parsed.lastWheelSpin === 'number' ? parsed.lastWheelSpin : 0,
    earnedSpins: typeof parsed.earnedSpins === 'number' ? parsed.earnedSpins : 0,
    adsWatchedForSpin: typeof parsed.adsWatchedForSpin === 'number' ? parsed.adsWatchedForSpin : 0,
  };
};

const readState = (): SocialState => {
  if (typeof window === 'undefined') return initialState();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialState();
    return validateState(JSON.parse(stored) as Partial<SocialState>);
  } catch {
    return initialState();
  }
};

export function useSocialState() {
  const [state, setState] = useState<SocialState>(readState);
  const [offline] = useState<boolean>(() => isOfflineMode());
  const serverReadyRef = useRef(false);
  const latestRef = useRef(state);
  latestRef.current = state;

  // Hydrate the canonical aggregate from the server when a real session exists.
  useEffect(() => {
    if (offline) return;
    let cancelled = false;
    fetchSocialProfile()
      .then((data) => {
        if (cancelled) return;
        serverReadyRef.current = true;
        setState(toClientState(data));
      })
      .catch(() => {
        serverReadyRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [offline]);

  // Mirror to localStorage for offline resilience.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Apply a server aggregate to local state (canonical reconciliation).
  const applyServer = useCallback((data: SocialData) => {
    setState(toClientState(data));
  }, []);

  // Offline-only local mutation helper.
  const localSet = useCallback((updater: (c: SocialState) => SocialState) => {
    setState((cur) => updater(cur));
  }, []);

  const tapLever = useCallback((model: ModelProfile) => {
    if (offline) {
      localSet((c) => {
        if (c.unlockedIds.includes(model.id) || c.lpBalance < revealLpPerTap(model)) return c;
        const next = Math.min(REVEAL_PANELS, (c.revealProgress[model.id] || 0) + 1);
        return {
          ...c,
          lpBalance: Math.round((c.lpBalance - revealLpPerTap(model)) * 100) / 100,
          revealProgress: { ...c.revealProgress, [model.id]: next },
          unlockedIds: next >= REVEAL_PANELS ? [...c.unlockedIds, model.id] : c.unlockedIds,
        };
      });
      return;
    }
    socialApi.revealTap(model.id).then((r) => applyServer(r.data)).catch(() => {});
  }, [offline, localSet, applyServer]);

  const unlockWithRm = useCallback((model: ModelProfile) => {
    if (offline) {
      localSet((c) => c.unlockedIds.includes(model.id) ? c : { ...c, unlockedIds: [...c.unlockedIds, model.id], rmSpent: Math.round((c.rmSpent + model.rmCost) * 100) / 100 });
      return;
    }
    socialApi.revealUnlock(model.id).then((r) => applyServer(r.data)).catch(() => {});
  }, [offline, localSet, applyServer]);

  const revealWithTicket = useCallback((model: ModelProfile) => {
    if (offline) return;
    socialApi.revealTicket(model.id).then((r) => applyServer(r.data)).catch(() => {});
  }, [offline, applyServer]);

  const useShotTicket = useCallback((modelId: string, postId: string) => {
    if (offline) return;
    socialApi.useShotTicket(modelId, postId).then((r) => applyServer(r.data)).catch(() => {});
  }, [offline, applyServer]);

  const addLp = useCallback((amount: number) => {
    if (offline) localSet((c) => ({ ...c, lpBalance: Math.round((c.lpBalance + amount) * 100) / 100 }));
  }, [offline, localSet]);

  const toggleList = useCallback((key: 'followingIds' | 'likedPostIds' | 'hotPostIds' | 'savedPostIds' | 'followedStyles', id: string) => {
    if (offline) {
      localSet((c) => {
        const list = c[key];
        return { ...c, [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id] };
      });
      return;
    }
    // Map client list keys to server endpoints.
    if (key === 'followingIds') {
      socialApi.follow(id).then((r) => applyServer(r.data)).catch(() => {});
    } else if (key === 'followedStyles') {
      socialApi.followStyle(id).then((r) => applyServer(r.data)).catch(() => {});
    } else if (key === 'likedPostIds' || key === 'savedPostIds' || key === 'hotPostIds') {
      const flag = key === 'likedPostIds' ? 'liked' : key === 'savedPostIds' ? 'saved' : 'hot';
      const currently = latestRef.current[key].includes(id);
      void currently;
      // Toggle by sending the inverse of current local membership.
      socialApi.post(id, flag as 'liked' | 'saved' | 'hot', !latestRef.current[key].includes(id))
        .then((r) => applyServer(r.data))
        .catch(() => {});
    }
  }, [offline, localSet, applyServer]);

  const toggleMute = useCallback(() => {
    if (offline) {
      localSet((c) => ({ ...c, muted: !c.muted }));
      return;
    }
    socialApi.mute(!latestRef.current.muted).then((r) => applyServer(r.data)).catch(() => {});
  }, [offline, localSet, applyServer]);

  const recordView = useCallback((id: string) => {
    if (offline) {
      localSet((c) => ({ ...c, viewCounts: { ...c.viewCounts, [id]: (c.viewCounts[id] || 0) + 1 } }));
      return;
    }
    socialApi.view(id).then((r) => applyServer(r.data)).catch(() => {});
  }, [offline, localSet, applyServer]);

  const grantReward = useCallback((reward: { rm?: number; lp?: number; modelTickets?: number; shotTickets?: number; mineMinutes?: number }) => {
    // Server-authoritative path: the wheel spins via socialApi.wheelSpin(),
    // which returns the canonical aggregate. grantReward is retained only for
    // the offline fallback so the rest of the UI can still credit locally.
    if (offline) {
      localSet((c) => ({
        ...c,
        rmBalance: Math.round((c.rmBalance + (reward.rm || 0)) * 100) / 100,
        lpBalance: Math.round((c.lpBalance + (reward.lp || 0)) * 100) / 100,
        modelTickets: c.modelTickets + (reward.modelTickets || 0),
        shotTickets: c.shotTickets + (reward.shotTickets || 0),
        bonusMineMinutes: c.bonusMineMinutes + (reward.mineMinutes || 0),
      }));
    }
  }, [offline, localSet]);

  const spinWheel = useCallback(async (): Promise<unknown | null> => {
    if (offline) return null;
    try {
      const r = await socialApi.wheelSpin();
      applyServer(r.data);
      return r.prize;
    } catch {
      return null;
    }
  }, [offline, applyServer]);

  const watchAd = useCallback(async (): Promise<void> => {
    if (offline) return;
    try {
      const r = await socialApi.adIntent();
      applyServer(r.data);
    } catch {
      /* ignore */
    }
  }, [offline, applyServer]);

  // Retained for backward-compat with any direct callers; the wheel UI now
  // uses spinWheel()/watchAd() which go through the server.
  const useDailySpin = useCallback(() => {}, []);
  const recordAdSpin = useCallback(() => {}, []);
  const consumeEarnedSpin = useCallback(() => {}, []);

  return {
    state,
    tapLever,
    unlockWithRm,
    revealWithTicket,
    useShotTicket,
    addLp,
    toggleList,
    toggleMute,
    recordView,
    grantReward,
    useDailySpin,
    recordAdSpin,
    consumeEarnedSpin,
    spinWheel,
    watchAd,
  };
}
