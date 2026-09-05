import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation } from 'wouter';
import { ArrowUpRight, BatteryCharging, Check, ChevronRight, CircleAlert, Cpu, Gem, History, Loader2, LockKeyhole, Pickaxe, Play, RefreshCw, Sparkles, Zap } from 'lucide-react';
import {
  ActivityItemType, AdRewardIntent, getGetActivityQueryKey, getGetMeQueryKey, getGetMinerQueryKey, useAuthenticatePreview, useAuthenticateTelegram, useClaimMining, useCompleteAdReward, useCreateAdRewardIntent, useGetActivity, useGetMe, useGetMiner, useUpgradeMiner,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import ExplorePage from '@/pages/explore';
import ExploreFeed from '@/pages/explore-feed';
import RevealPage from '@/pages/reveal';
import ModelPage from '@/pages/model';
import StylesPage from '@/pages/styles';
import StylePage from '@/pages/style';
import MePage from '@/pages/me';
import MarketPage from '@/pages/market';
import MarketMinersPage from '@/pages/market-miners';
import MarketSkinsPage from '@/pages/market-skins';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ENABLE_OFFLINE_FALLBACK, OFFLINE_ACTIVITY, OFFLINE_MINER, OFFLINE_USER, isOfflineMode, setOfflineMode } from '@/lib/offline';
import { SocialShell, SocialTopBar } from '@/components/social-shell';

const queryClient = new QueryClient();

const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID as string | undefined;
const MONETAG_SDK_NAME = MONETAG_ZONE_ID ? `show_${MONETAG_ZONE_ID}` : '';
type MonetagShowAd = (placement?: string) => Promise<unknown>;

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData?: string; ready?: () => void } };
  }
}

function getMonetagShowAd(): MonetagShowAd | undefined {
  if (!MONETAG_SDK_NAME) return undefined;
  return (window as unknown as Record<string, MonetagShowAd | undefined>)[MONETAG_SDK_NAME];
}

function waitForMonetagShowAd(timeoutMs = 10000): Promise<MonetagShowAd> {
  if (!MONETAG_SDK_NAME) {
    // No Monetag zone configured: simulate a rewarded ad so the recharge loop
    // still works (e.g. local testing). The server still grants the reward on
    // completeAdReward, so progress is real against the backend.
    return Promise.resolve(() => new Promise((resolve) => window.setTimeout(resolve, 1600)));
  }
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      const showAd = getMonetagShowAd();
      if (showAd) {
        resolve(showAd);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Monetag SDK did not become available. Check the configured zone and site approval.'));
        return;
      }
      window.setTimeout(check, 250);
    };
    check();
  });
}

const fmt = (value = 0, digits = 2) => value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const timeLeft = (mins = 0) => `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m`;
const errorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'data' in error && (error as { data?: { error?: string }}).data?.error) return (error as {data: {error: string}}).data.error;
  return error instanceof Error ? error.message : 'The signal dropped. Try again.';
};

function Spinner({ label = 'Syncing' }: { label?: string }) {
  return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />{label}</div>;
}

function Shell({ children, miner, user }: { children: ReactNode; miner?: any; user?: any }) {
  const balance = user?.balance ?? miner?.balance ?? 0;
  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar balance={balance} />
      <div className="mt-2">{children}</div>
    </SocialShell>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const telegramAuth = useAuthenticateTelegram();
  const previewAuth = useAuthenticatePreview();
  // Telegram populates WebApp.initData only after its SDK script initializes.
  // Read it after WebApp.ready(), and poll briefly in case it lands a tick later.
  const [initData, setInitData] = useState(() =>
    typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : '',
  );
  const [started, setStarted] = useState(false);
  const [previewStarted, setPreviewStarted] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    const read = () => {
      const data = window.Telegram?.WebApp?.initData || '';
      if (data) {
        setInitData(data);
        return true;
      }
      return false;
    };
    if (!read()) {
      const t = window.setInterval(() => {
        if (read()) window.clearInterval(t);
      }, 200);
      // If Telegram never supplies initData (opened outside the Mini App), fall
      // back to the browser-preview session after a short grace period.
      window.setTimeout(() => {
        window.clearInterval(t);
        setPreviewStarted(true);
      }, 3000);
    }
  }, []);
  useEffect(() => {
    if (started || previewStarted) return;
    if (initData) {
      setStarted(true);
      telegramAuth.mutate({ data: { initData } });
    } else if (previewStarted) {
      setStarted(true);
      previewAuth.mutate();
    }
  }, [initData, started, previewStarted, telegramAuth, previewAuth]);
  const retryAuth = () => {
    const data = window.Telegram?.WebApp?.initData || '';
    if (data) telegramAuth.mutate({ data: { initData: data } });
    else previewAuth.mutate();
  };
  const auth = started && initData ? telegramAuth : previewAuth;
  // When the (optional) backend is unreachable, drop into a local preview
  // session so the social prototype stays fully testable in a bare browser.
  if (auth.isError && ENABLE_OFFLINE_FALLBACK && !isOfflineMode()) {
    setOfflineMode(true);
    setOffline(true);
  }
  if (offline || isOfflineMode()) return <>{children}</>;
  // Hold on the loading screen until we've actually kicked off an auth call
  // (Telegram or preview), so we never flash the wrong account's data.
  if (!started) return <LoadingScreen label="Establishing secure session" />;
  if (auth.isPending) return <LoadingScreen label="Establishing secure session" />;
  if (auth.isError) return <div className="grid min-h-[100dvh] place-items-center bg-background p-6"><div className="w-full max-w-md rounded-[28px] border border-destructive/30 bg-card p-8 text-center"><CircleAlert className="mx-auto size-10 text-destructive" /><h1 className="mt-5 font-display text-2xl font-bold">Session rejected</h1><p className="mt-2 text-sm text-muted-foreground">{errorMessage(auth.error)}</p><button data-testid="button-retry-auth" onClick={retryAuth} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-secondary/80"><RefreshCw className="size-4" /> Retry connection</button></div></div>;
  return <>{children}</>;
}

function LoadingScreen({ label = 'Loading your station' }: { label?: string }) { return <div className="grid min-h-[100dvh] place-items-center bg-background p-6"><div className="w-full max-w-sm space-y-4"><div className="h-5 w-32 animate-pulse rounded bg-muted" /><div className="h-40 animate-pulse rounded-[28px] bg-muted" /><div className="h-20 animate-pulse rounded-2xl bg-muted" /><Spinner label={label} /></div></div>; }
function QueryError({ onRetry }: { onRetry: () => void }) { return <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 text-destructive" /><div><p className="font-semibold">Could not reach the station</p><p className="mt-1 text-sm text-muted-foreground">The miner data is temporarily out of range.</p><button data-testid="button-retry-query" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary"><RefreshCw className="size-3.5" /> Try again</button></div></div></div>; }

function MinerVisual({ miner, compact = false }: { miner: any; compact?: boolean }) {
  const pct = Math.min(100, ((miner?.currentEnergyMinutes || 0) / (miner?.maxEnergyMinutes || 1)) * 100);
  return <div className={`relative overflow-hidden rounded-[28px] border border-primary/15 bg-[#111a23] ${compact ? 'p-5' : 'p-6 sm:p-9'}`}>
    <div className="absolute inset-0 grid-lines opacity-50" /><div className="absolute -right-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
    <div className="relative flex items-start justify-between"><div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-primary"><span className="size-1.5 animate-pulse rounded-full bg-primary" /> Live extraction</div><h2 className={`mt-3 font-display font-bold ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>{miner?.name || 'Signal Drill'}</h2><p className="mt-1 text-xs text-muted-foreground">Mk. {miner?.level || 1} / autonomous rig</p></div><div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-drift"><Cpu className="size-6" /></div></div>
    <div className={`relative mx-auto flex aspect-square max-w-[260px] items-center justify-center ${compact ? 'my-5' : 'my-8 sm:my-10'}`}><div className="absolute inset-[9%] rounded-full border border-primary/20 animate-pulse-ring" /><div className="absolute inset-[18%] rounded-full border border-dashed border-accent/25" /><div className="absolute inset-[29%] rounded-full bg-primary/10 shadow-[0_0_70px_hsl(164_92%_53%_/_0.18)]" /><div className="relative flex size-[41%] items-center justify-center rounded-[30%] border border-primary/50 bg-[#18322f] text-primary shadow-[inset_0_0_30px_hsl(164_92%_53%_/_0.15),0_0_35px_hsl(164_92%_53%_/_0.18)]"><Pickaxe className="size-12 -rotate-45 sm:size-14" /></div><span className="absolute left-[6%] top-[38%] size-1.5 rounded-full bg-accent shadow-[0_0_12px_hsl(41_96%_63%)]" /><span className="absolute right-[10%] top-[22%] size-1 rounded-full bg-primary" /><span className="absolute bottom-[18%] right-[19%] size-1.5 rounded-full bg-primary" /></div>
    <div className="relative"><div className="mb-2 flex items-end justify-between"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Energy reserve</span><span data-testid="text-energy" className="font-mono text-sm text-foreground">{timeLeft(miner?.currentEnergyMinutes)} <span className="text-muted-foreground">/ {timeLeft(miner?.maxEnergyMinutes)}</span></span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700" style={{ width: `${pct}%` }} /></div><div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>{miner?.isMining ? 'Rig is extracting' : 'Rig is paused'}</span><span className="font-mono text-primary">+{fmt(miner?.miningRate, 3)} RM / min</span></div></div>
  </div>;
}

function AppData({ children }: { children: (data: { user: any; miner: any; activity: any[] }) => ReactNode }) {
  const offline = isOfflineMode();
  const me = useGetMe(); const miner = useGetMiner(); const activity = useGetActivity();
  if (!offline && (me.isLoading || miner.isLoading || activity.isLoading)) return <LoadingScreen />;
  if (!offline && (me.isError || miner.isError || activity.isError)) return <div className="min-h-[100dvh] p-6 pt-20"><QueryError onRetry={() => { void me.refetch(); void miner.refetch(); void activity.refetch(); }} /></div>;
  const user = offline ? OFFLINE_USER : me.data;
  const minerData = offline ? OFFLINE_MINER : miner.data;
  const activityData = offline ? OFFLINE_ACTIVITY : (activity.data || []);
  return <>{children({ user, miner: minerData, activity: activityData })}</>;
}

function Overview() {
  return <AuthGate><AppData>{({ user, miner, activity }) => <Shell user={user} miner={miner}><div className="animate-rise">
    <p className="font-mono text-[10px] uppercase tracking-[.24em] text-primary">Station online</p>
    <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Good to see you, <span className="text-primary text-glow">{user?.firstName || 'Miner'}.</span></h1>
    <p className="mt-2 text-sm text-muted-foreground">Your rig has been working while you were away.</p>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <StatCard icon={<Gem />} label="Available balance" value={`${fmt(user?.balance)} RM`} accent="text-accent" detail="Ready to use" testId="text-balance" />
      <StatCard icon={<BatteryCharging />} label="Stored output" value={`${fmt(miner?.minedAmount, 3)} RM`} detail="Awaiting extraction" testId="text-mined-amount" />
    </div>
    <div className="mt-5"><MinerVisual miner={miner} /></div>
    <Link href="/miner" data-testid="link-open-miner" className="grad-cta mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-transform active:scale-[.98]">Open miner <ArrowUpRight className="size-4" /></Link>
    <div className="mt-8 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Recent telemetry</p><h2 className="mt-2 font-display text-xl font-bold">Activity log</h2></div><Link href="/miner" data-testid="link-activity-detail" className="text-xs font-semibold text-primary">View station <ChevronRight className="ml-1 inline size-3" /></Link></div><ActivityList activity={activity} />
  </div></Shell>}</AppData></AuthGate>;
}

function StatCard({ icon, label, value, detail, accent = 'text-foreground', testId }: { icon: ReactNode; label: string; value: string; detail: string; accent?: string; testId: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-muted-foreground">{icon && <span className="text-primary [&>svg]:size-4">{icon}</span>}<span className="font-mono text-[10px] uppercase tracking-widest">{label}</span></div><div data-testid={testId} className={`mt-4 font-display text-2xl font-bold ${accent}`}>{value}</div><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function ActivityList({ activity }: { activity: any[] }) { if (!activity.length) return <div data-testid="empty-activity" className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center"><History className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No telemetry yet</p><p className="mt-1 text-xs text-muted-foreground">Your first extraction will appear here.</p></div>; return <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{activity.slice(0, 5).map((item: any, index: number) => <div data-testid={`row-activity-${item.id || index}`} key={item.id || index} className="flex items-center gap-3 px-4 py-4 sm:px-5"><span className={`flex size-9 items-center justify-center rounded-xl ${item.type === ActivityItemType.AD_REWARD ? 'bg-accent/10 text-accent' : item.type === ActivityItemType.MINER_UPGRADE ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{item.type === ActivityItemType.AD_REWARD ? <Play className="size-4" /> : item.type === ActivityItemType.MINER_UPGRADE ? <Zap className="size-4" /> : <Pickaxe className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div><span className="font-mono text-sm text-primary">+{fmt(item.amount, 3)} RM</span></div>)}</div>; }

function MinerPage() {
  const qc = useQueryClient(); const { data: miner, isLoading, isError, refetch } = useGetMiner(); const claim = useClaimMining(); const intent = useCreateAdRewardIntent(); const complete = useCompleteAdReward(); const [adBusy, setAdBusy] = useState(false); const [adError, setAdError] = useState(''); const [rewardIntent, setRewardIntent] = useState<AdRewardIntent | null>(null);
  const claimNow = () => claim.mutate(undefined, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetMinerQueryKey() }); void qc.invalidateQueries({ queryKey: getGetMeQueryKey() }); void qc.invalidateQueries({ queryKey: getGetActivityQueryKey() }); } });
   const watchAd = () => { setAdError(''); setAdBusy(true); intent.mutate(undefined, { onSuccess: async (newIntent) => { setRewardIntent(newIntent); try { const showAd = await waitForMonetagShowAd(); await showAd(); complete.mutate({ data: { intentId: newIntent.intentId } }, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetMinerQueryKey() }); void qc.invalidateQueries({ queryKey: getGetActivityQueryKey() }); setAdBusy(false); setRewardIntent(null); } , onError: (e) => { setAdError(errorMessage(e)); setAdBusy(false); } }); } catch (e) { setAdError(errorMessage(e)); setAdBusy(false); } }, onError: (e) => { setAdError(errorMessage(e)); setAdBusy(false); } }); };
  if (isLoading) return <LoadingScreen />; if (isError || !miner) return <div className="p-4"><QueryError onRetry={() => void refetch()} /></div>;
  return <AuthGate><Shell miner={miner}><div className="animate-rise"><div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-[.24em] text-primary">Miner control / live</p><div className="mt-3 flex flex-col gap-2"><div><h1 className="font-display text-3xl font-bold">The rig is yours.</h1><p className="mt-2 text-sm text-muted-foreground">Charge it, let it run, come back for the signal.</p></div><span className="font-mono text-[10px] text-muted-foreground">Updated {new Date(miner.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div><div className="grid gap-4"><MinerVisual miner={miner} /><div className="space-y-4"><div className="rounded-2xl border border-border bg-card p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Output ready</p><div data-testid="text-miner-output" className="mt-3 font-display text-4xl font-bold text-accent">{fmt(miner.minedAmount, 3)} <span className="text-lg">RM</span></div><p className="mt-1 text-xs text-muted-foreground">Extract your accumulated signal into your balance.</p><button data-testid="button-claim-mining" onClick={claimNow} disabled={claim.isPending || miner.minedAmount <= 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{claim.isPending ? <Loader2 className="size-4 animate-spin" /> : <Gem className="size-4" />} {claim.isPending ? 'Extracting' : 'Extract RM Coin'}</button></div><div className="rounded-2xl border border-accent/20 bg-accent/[.06] p-5"><div className="flex items-center gap-2 text-accent"><Sparkles className="size-4" /><span className="font-mono text-[10px] uppercase tracking-widest">Recharge protocol</span></div><p className="mt-3 text-sm font-semibold">Watch one short ad</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Add {intent.data?.rewardMinutes || 30} minutes to the reserve and keep your rig moving.</p><button data-testid="button-watch-ad" onClick={watchAd} disabled={adBusy || complete.isPending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-bold text-accent disabled:opacity-50">{adBusy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {complete.isPending ? 'Applying charge' : adBusy ? 'Loading reward' : 'Watch & recharge'}</button>{rewardIntent && <p className="mt-3 font-mono text-[10px] text-muted-foreground">Intent issued · {timeLeft(rewardIntent.rewardMinutes)} charge</p>}{adError && <p data-testid="status-ad-error" className="mt-3 text-xs text-destructive">{adError}</p>}</div></div></div></div></Shell></AuthGate>;
}

function UpgradePage() {
  const qc = useQueryClient(); const { data: miner, isLoading, isError, refetch } = useGetMiner(); const upgrade = useUpgradeMiner(); if (isLoading) return <LoadingScreen />; if (isError || !miner) return <div className="p-4"><QueryError onRetry={() => void refetch()} /></div>;
  const next = miner.nextUpgrade; const canUpgrade = Boolean(next && miner.balance >= next.upgradeCost); const doUpgrade = () => next && upgrade.mutate({ data: { targetLevel: next.level } }, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetMinerQueryKey() }); void qc.invalidateQueries({ queryKey: getGetMeQueryKey() }); void qc.invalidateQueries({ queryKey: getGetActivityQueryKey() }); } });
  return <AuthGate><Shell miner={miner}><div className="animate-rise mx-auto max-w-4xl"><p className="font-mono text-[10px] uppercase tracking-[.24em] text-primary">Progression / hardware bay</p><h1 className="mt-3 font-display text-4xl font-bold">Push the limit.</h1><p className="mt-2 max-w-lg text-sm text-muted-foreground">Every upgrade makes the ritual faster. Spend your balance on a rig that can hold more charge.</p><div className="mt-9 grid gap-5 md:grid-cols-[.8fr_1.2fr]"><div className="rounded-[28px] border border-border bg-card p-6 sm:p-8"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Current frame</span><span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] text-primary">MK. {miner.level}</span></div><div className="mt-12 text-center"><div className="mx-auto flex size-28 items-center justify-center rounded-[34px] border border-primary/30 bg-primary/10 text-primary shadow-[0_0_50px_hsl(164_92%_53%_/_0.12)]"><Cpu className="size-14" /></div><h2 className="mt-6 font-display text-2xl font-bold">{miner.name}</h2><p className="mt-2 text-xs text-muted-foreground">Current production rate</p><p data-testid="text-current-rate" className="mt-2 font-mono text-xl text-primary">{fmt(miner.miningRate, 3)} RM / min</p></div></div><div className="rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/[.12] to-card p-6 sm:p-8"><div className="flex items-center gap-2 text-primary"><ArrowUpRight className="size-4" /><span className="font-mono text-[10px] uppercase tracking-widest">Next blueprint</span></div>{next ? <><div className="mt-8 flex items-end justify-between"><div><p className="font-mono text-xs text-muted-foreground">MK. {next.level}</p><h2 data-testid="text-next-miner" className="mt-1 font-display text-3xl font-bold">{next.name}</h2></div><div className="text-right"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Upgrade cost</p><p data-testid="text-upgrade-cost" className="mt-1 font-display text-2xl font-bold text-accent">{fmt(next.upgradeCost)} RM</p></div></div><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-xl border border-border bg-background/50 p-4"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Rate</p><p className="mt-2 font-mono text-sm text-primary">{fmt(next.miningRate, 3)} RM/min</p></div><div className="rounded-xl border border-border bg-background/50 p-4"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Capacity</p><p className="mt-2 font-mono text-sm text-primary">{timeLeft(next.maxEnergyMinutes)}</p></div></div><div className="mt-8 flex items-center justify-between text-xs"><span className="text-muted-foreground">Your balance</span><span className="font-mono text-accent">{fmt(miner.balance)} RM</span></div><button data-testid="button-upgrade-miner" onClick={doUpgrade} disabled={!canUpgrade || upgrade.isPending} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{upgrade.isPending ? <Loader2 className="size-4 animate-spin" /> : canUpgrade ? <Check className="size-4" /> : <LockKeyhole className="size-4" />}{upgrade.isPending ? 'Installing' : canUpgrade ? 'Install upgrade' : `Need ${fmt(next.upgradeCost - miner.balance)} RM more`}</button></> : <div className="py-16 text-center"><Check className="mx-auto size-10 text-primary" /><h2 className="mt-4 font-display text-2xl font-bold">Peak frame reached</h2><p className="mt-2 text-sm text-muted-foreground">This rig has no further blueprints.</p></div>}</div></div></div></Shell></AuthGate>;
}

function SocialRoute({ page }: { page: 'explore' | 'explore-feed' | 'reveal' | 'model' | 'styles' | 'style' | 'me' | 'market' }) {
  return <AuthGate><AppData>{({ user, miner }) => page === 'explore' ? <ExplorePage user={user} miner={miner} /> : page === 'explore-feed' ? <ExploreFeed user={user} miner={miner} /> : page === 'reveal' ? <RevealPage user={user} miner={miner} /> : page === 'styles' ? <StylesPage user={user} miner={miner} /> : page === 'style' ? <StylePage user={user} miner={miner} /> : page === 'me' ? <MePage user={user} miner={miner} /> : page === 'market' ? <MarketPage user={user} miner={miner} /> : <ModelPage user={user} miner={miner} />}</AppData></AuthGate>;
}

function Router() { const [location] = useLocation(); return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Overview} /><Route path="/miner" component={MinerPage} /><Route path="/upgrade" component={UpgradePage} /><Route path="/market"><SocialRoute page="market" /></Route><Route path="/market/miners"><MarketMinersPage /></Route><Route path="/market/skins"><MarketSkinsPage /></Route><Route path="/explore"><SocialRoute page="explore" /></Route><Route path="/explore/feed"><SocialRoute page="explore-feed" /></Route><Route path="/styles"><SocialRoute page="styles" /></Route><Route path="/styles/:id"><SocialRoute page="style" /></Route><Route path="/me"><SocialRoute page="me" /></Route><Route path="/reveal/:id"><SocialRoute page="reveal" /></Route><Route path="/model/:id"><SocialRoute page="model" /></Route><Route component={NotFound} /></Switch></ErrorBoundary>; }
function App() { useEffect(() => { if (!MONETAG_ZONE_ID || !MONETAG_SDK_NAME) return; const script = document.createElement('script'); script.src = 'https://libtl.com/sdk.js'; script.dataset.zone = MONETAG_ZONE_ID; script.dataset.sdk = MONETAG_SDK_NAME; script.async = true; script.onerror = () => { console.error('Monetag SDK failed to load', { zone: MONETAG_ZONE_ID }); }; document.head.appendChild(script); return () => { script.remove(); }; }, []); return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;