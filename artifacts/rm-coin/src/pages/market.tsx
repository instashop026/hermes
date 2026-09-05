import { useMemo, useState } from 'react';
import { ArrowUpRight, CircleAlert, Clock, Coins, Gem, Gift, Loader2, Play, Sparkles, Ticket } from 'lucide-react';
import { Link } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { useSocialState } from '@/hooks/use-social-state';

const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID as string | undefined;
const MONETAG_SDK_NAME = MONETAG_ZONE_ID ? `show_${MONETAG_ZONE_ID}` : '';

// Resolves to the ad-play function. In production this is the Monetag SDK;
// in offline/preview (no zone configured) we simulate a rewarded ad so the
// spin loop is testable without a real ad network.
function waitForSpinAd(timeoutMs = 10000): Promise<() => Promise<unknown>> {
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
        reject(new Error('The spin ad station is not ready yet.'));
        return;
      }
      window.setTimeout(check, 250);
    };
    check();
  });
}

type MarketPageProps = { user?: any; miner?: any };

// Prize wheel slices. Tickets use the brand orange-pastel; coins are darker.
type Prize = { key: string; label: string; kind: 'rm' | 'lp' | 'modelTicket' | 'shotTicket' | 'mineMinutes'; value: number; color: string; icon: 'rm' | 'lp' | 'ticket' | 'clock' };
const PRIZES: Prize[] = [
  { key: 'rm-02', label: '0.2 RM', kind: 'rm', value: 0.2, color: '#1d2b33', icon: 'rm' },
  { key: 'lp-05', label: '5 LP', kind: 'lp', value: 5, color: '#243038', icon: 'lp' },
  { key: 'model', label: 'Model Ticket', kind: 'modelTicket', value: 1, color: '#e9a06a', icon: 'ticket' },
  { key: 'time-5', label: '+5m Mine', kind: 'mineMinutes', value: 5, color: '#1d2b33', icon: 'clock' },
  { key: 'rm-05', label: '0.5 RM', kind: 'rm', value: 0.5, color: '#243038', icon: 'rm' },
  { key: 'lp-12', label: '12 LP', kind: 'lp', value: 12, color: '#1d2b33', icon: 'lp' },
  { key: 'shot', label: 'Shot Ticket', kind: 'shotTicket', value: 1, color: '#e9a06a', icon: 'ticket' },
  { key: 'time-15', label: '+15m Mine', kind: 'mineMinutes', value: 15, color: '#243038', icon: 'clock' },
];
const SLICE = 360 / PRIZES.length;
const DAY_MS = 24 * 60 * 60 * 1000;

export default function MarketPage({ user, miner }: MarketPageProps) {
  const { state, spinWheel, watchAd } = useSocialState();
  const [spinning, setSpinning] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [adError, setAdError] = useState('');
  const [rotation, setRotation] = useState(0);
  const [won, setWon] = useState<Prize | null>(null);

  // One free spin per 24h + spins earned from ads.
  const dailyReady = Date.now() - state.lastWheelSpin >= DAY_MS;
  const canSpin = !spinning && (dailyReady || state.earnedSpins > 0);

  const roll = () => {
    if (!canSpin) return;
    setWon(null);
    setSpinning(true);
    // Server picks the prize; we only animate. The result returns the
    // canonical aggregate, so the client can never self-credit rewards.
    const tick = Math.floor(Math.random() * PRIZES.length);
    const target = 360 * 2 + (360 - (tick * SLICE + SLICE / 2));
    setRotation((r) => r + target - (r % 360));
    window.setTimeout(async () => {
      const prize = await spinWheel();
      setWon(prize ? PRIZES.find((p) => p.key === (prize as { key: string }).key) ?? null : null);
      setSpinning(false);
    }, 2600);
  };

  const onWatchAd = () => {
    if (spinning || adBusy) return;
    setAdBusy(true);
    setAdError('');
    void (async () => {
      try {
        // Play the actual rewarded ad BEFORE crediting the server, so the
        // user watches the ad (filled progress is granted only after it plays).
        const showAd = await waitForSpinAd();
        await showAd();
        await watchAd();
      } catch (error) {
        setAdError(error instanceof Error ? error.message : 'The ad station could not connect.');
      } finally {
        setAdBusy(false);
      }
    })();
  };

  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title="Market" balance={user?.balance ?? miner?.balance ?? 0} />
      <div className="mt-3 animate-rise">
        {/* Inventory strip */}
        <div className="flex flex-wrap gap-2">
          <InvChip icon={<Ticket className="size-3.5" />} label="Model" value={state.modelTickets} />
          <InvChip icon={<Ticket className="size-3.5" />} label="Shot" value={state.shotTickets} />
          <InvChip icon={<Clock className="size-3.5" />} label="Mine" value={`+${state.bonusMineMinutes}m`} />
          <InvChip icon={<Coins className="size-3.5" />} label="RM" value={state.rmBalance.toFixed(1)} />
        </div>

        {/* Two category entry buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <CategoryButton href="/market/miners" title="Miners" caption="Rigs & engines" accent="#8be6d2" />
          <CategoryButton href="/market/skins" title="Skins" caption="Miner skins" accent="#ffbd7d" />
        </div>

        {/* Prize wheel */}
        <div className="mt-7">
          <div className="flex items-center gap-2 text-primary">
            <Gift className="size-4" />
            <span className="font-mono text-[10px] uppercase tracking-[.22em]">Prize wheel</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">1 free spin / 24h — or earn spins by watching ads.</p>

          <div className="relative mx-auto mt-5 size-64">
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 text-foreground">
              <div className="size-0 border-x-[9px] border-t-[14px] border-x-transparent border-t-foreground" />
            </div>
            <div
              className="size-full rounded-full border border-border/70 shadow-[0_0_40px_hsl(164_92%_53%_/_0.12)]"
              style={{ background: `conic-gradient(${PRIZES.map((p, i) => `${p.color} ${i * SLICE}deg ${(i + 1) * SLICE}deg`).join(',')})`, transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 2.6s cubic-bezier(.17,.67,.32,1.2)' : 'none' }}
            >
              {PRIZES.map((p, i) => (
                <div key={p.key} className="absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${i * SLICE + SLICE / 2}deg)` }}>
                  <span className="mt-3 text-center text-[9px] font-semibold leading-tight text-white/85">{p.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={roll}
              disabled={!canSpin}
              data-testid="button-roll"
              className="absolute left-1/2 top-1/2 z-20 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/40 bg-[#0c161b] text-primary shadow-[0_0_30px_hsl(164_92%_53%_/_0.3)] transition-transform active:scale-95 disabled:opacity-40"
            >
              {spinning ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6" />}
            </button>
          </div>

          {/* Spin availability */}
          <div className="mt-3 text-center text-xs">
            {spinning ? (
              <span className="text-muted-rolling">Spinning…</span>
            ) : dailyReady ? (
              <span className="text-primary">Free daily spin ready</span>
            ) : state.earnedSpins > 0 ? (
              <span className="text-accent">{state.earnedSpins} earned spin{state.earnedSpins > 1 ? 's' : ''} ready</span>
            ) : (
              <span className="text-muted-foreground">Free spin refreshes in {Math.ceil((DAY_MS - (Date.now() - state.lastWheelSpin)) / 3_600_000)}h · watch ads for more</span>
            )}
          </div>

          {won && (
            <div data-testid="text-won" className="mt-3 rounded-2xl border border-primary/25 bg-primary/[.08] p-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">You won</p>
              <p className="mt-1 font-display text-xl font-bold text-primary">{won.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">Added to your inventory.</p>
            </div>
          )}

          {/* Watch-ad for spins */}
          {adError && (
            <p className="mt-2 flex items-center gap-2 text-xs text-destructive"><CircleAlert className="size-3.5" />{adError}</p>
          )}
          <button
            onClick={onWatchAd}
            disabled={spinning || adBusy}
            data-testid="button-watch-ad"
            className="grad-accent mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-transform active:scale-[.98] disabled:opacity-50"
          >
            {adBusy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {adBusy ? 'Loading ad…' : 'Watch ad for a spin'}
            <span className="ml-1 rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums">{state.adsWatchedForSpin}/10</span>
          </button>
        </div>
      </div>
    </SocialShell>
  );
}

function InvChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-[11px] font-semibold">
      <span className="text-primary [&>svg]:size-3.5">{icon}</span>
      {label}
      <span className="font-mono text-accent">{value}</span>
    </span>
  );
}

function CategoryButton({ href, title, caption, accent }: { href: string; title: string; caption: string; accent: string }) {
  return (
    <Link href={href} data-testid={`button-market-${title.toLowerCase()}`} className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-4 transition-transform active:scale-[.98]">
      <span className="flex size-12 items-center justify-center rounded-xl" style={{ background: `${accent}22`, color: accent }}>
        <Gem className="size-6" />
      </span>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-lg font-bold">{title}</p>
          <p className="text-[10px] text-muted-foreground">{caption}</p>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}
