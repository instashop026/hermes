import { useMemo, useState } from 'react';
import { ChevronRight, CircleAlert, Filter, Layers, Play, Users } from 'lucide-react';
import { Link } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { useSocialState } from '@/hooks/use-social-state';
import { useCatalog } from '@/hooks/use-catalog';
import { formatFollowers, findModel, MODEL_PROFILES, revealLpPerTap, type ModelProfile } from '@/lib/social-data';

type ExplorePageProps = { user?: any; miner?: any };

const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID as string | undefined;
const MONETAG_SDK_NAME = MONETAG_ZONE_ID ? `show_${MONETAG_ZONE_ID}` : '';

// Resolves to the ad-play function. In production this is the Monetag SDK;
// in offline/preview (no zone configured) we simulate a rewarded ad so the
// Leverage Points loop is testable without a real ad network.
function waitForLeverageAd(timeoutMs = 10000): Promise<() => Promise<unknown>> {
  if (!MONETAG_SDK_NAME) {
    return Promise.resolve(() => new Promise((resolve) => window.setTimeout(resolve, 1600)));
  }
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      const showAd = (window as unknown as Record<string, (() => Promise<unknown>) | undefined>)[MONETAG_SDK_NAME];
      if (showAd) {
        resolve(showAd);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('The LP ad station is not ready yet.'));
        return;
      }
      window.setTimeout(check, 250);
    };
    check();
  });
}

type FilterTab = 'all' | 'revealed' | 'unrevealed';

export default function ExplorePage({ user, miner }: ExplorePageProps) {
  const { state, watchAd } = useSocialState();
  const { models: catalogModels } = useCatalog();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [lpAdBusy, setLpAdBusy] = useState(false);
  const [lpAdError, setLpAdError] = useState('');
  const revealedModels = catalogModels.filter((model) => state.unlockedIds.includes(model.id));
  const unrevealedModels = catalogModels.filter((model) => !state.unlockedIds.includes(model.id));
  const starterModels = state.starterIds.map((id) => findModel(id)).filter((model): model is ModelProfile => Boolean(model));
  const rmBalance = user?.balance ?? miner?.balance ?? 0;

  const browseModels = useMemo(() => {
    const base =
      filter === 'revealed' ? revealedModels :
      filter === 'unrevealed' ? unrevealedModels :
      catalogModels;
    return base.filter((model) => `${model.name} ${model.handle} ${model.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim()));
  }, [filter, revealedModels, unrevealedModels, query]);

  const watchLeverageAd = async () => {
    setLpAdBusy(true);
    setLpAdError('');
    try {
      const showAd = await waitForLeverageAd();
      await showAd();
      // Server-authoritative when online (credits LP + persists); local only in
      // offline preview mode. The hook already branches on offline vs backend.
      await watchAd();
    } catch (error) {
      setLpAdError(error instanceof Error ? error.message : 'The LP station could not connect.');
    } finally {
      setLpAdBusy(false);
    }
  };

  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title="Models" balance={rmBalance} />
      <div className="mt-3 animate-rise">
        {/* LP recharge strip */}
        <section className="social-card flex items-center gap-3 p-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Play className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Earn Leverage Points</p>
            <p className="truncate text-xs text-muted-foreground">Watch a short ad · +0.5 LP · you have <span className="font-mono text-accent">{state.lpBalance.toFixed(1)}</span></p>
          </div>
          <button data-testid="button-watch-lp-ad" onClick={() => void watchLeverageAd()} disabled={lpAdBusy} className="grad-accent inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-transform active:scale-95 disabled:opacity-60">{lpAdBusy ? 'Loading…' : 'Watch'}</button>
        </section>
        {lpAdError && <p data-testid="status-lp-ad-error" className="mt-2 flex items-center gap-2 text-xs text-destructive"><CircleAlert className="size-3.5" />{lpAdError}</p>}

        {/* 2-col: Watch ad (tall) + Styles (tall, → /styles) */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button data-testid="button-watch-lp-ad-tall" onClick={() => void watchLeverageAd()} disabled={lpAdBusy} className="grad-accent flex min-h-[116px] flex-col items-center justify-center gap-2 rounded-2xl px-4 py-5 text-center transition-transform active:scale-[.98] disabled:opacity-60">
            <Play className="size-7" />
            <span className="text-sm font-bold">Watch ad</span>
            <span className="text-[11px] text-white/80">+0.5 LP · you have <span className="font-mono">{state.lpBalance.toFixed(1)}</span></span>
          </button>
          <Link href="/styles" data-testid="button-open-styles" className="flex min-h-[116px] flex-col items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[.12] to-card px-4 py-5 text-center transition-transform active:scale-[.98]">
            <Layers className="size-7 text-primary" />
            <span className="text-sm font-bold">Styles</span>
            <span className="text-[11px] text-muted-foreground">Browse by mood</span>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="mt-5 flex items-center gap-2">
          <div data-testid="tabs-models-filter" className="flex flex-1 rounded-full border border-border/70 bg-card p-1">
            <button data-testid="tab-all" onClick={() => setFilter('all')} className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>All · {catalogModels.length}</button>
            <button data-testid="tab-revealed" onClick={() => setFilter('revealed')} className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors ${filter === 'revealed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Revealed · {revealedModels.length}</button>
            <button data-testid="tab-unrevealed" onClick={() => setFilter('unrevealed')} className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors ${filter === 'unrevealed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Unrevealed · {unrevealedModels.length}</button>
          </div>
          <label className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground"><Filter className="size-4" /></label>
        </div>

        {/* Search */}
        <input data-testid="input-search-models" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models, moods, cities" className="mt-2.5 w-full rounded-full border border-border/70 bg-card px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50" />

        {/* Grid */}
        <section className="mt-4 grid grid-cols-3 gap-2.5">
          {browseModels.map((model) => {
            const unlocked = state.unlockedIds.includes(model.id);
            return (
              <Link key={model.id} href={unlocked ? `/model/${model.id}` : `/reveal/${model.id}`} data-testid={unlocked ? `card-discovered-model-${model.id}` : `card-starter-model-${model.id}`} className={`group relative block aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card ${unlocked ? '' : 'animated-border'}`}>
                {unlocked ? (
                  <img src={model.avatar} alt={model.name} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <img src="/reveal-overlay.png" alt={`Locked editorial for ${model.name}`} className="size-full object-cover" style={{ objectPosition: 'center 30%' }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#071113]/85 via-transparent to-transparent" />
                <div className="absolute inset-x-2 bottom-2">
                  <p className="truncate text-[11px] font-semibold text-white">{unlocked ? model.name : 'Hidden Model'}</p>
                  {!unlocked && <p className="text-[9px] text-white/70">{revealLpPerTap(model)} LP / tap</p>}
                </div>
              </Link>
            );
          })}
        </section>
        {browseModels.length === 0 && (
          <div data-testid="empty-model-search" className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
            <Users className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">No models matched</p>
            <p className="mt-1 text-xs text-muted-foreground">Try a different search or switch tabs.</p>
          </div>
        )}
      </div>
    </SocialShell>
  );
}
