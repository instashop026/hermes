import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, CircleAlert, Coins, Loader2, Sparkles, Ticket, Zap } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { useSocialState } from '@/hooks/use-social-state';
import { useModelProfile } from '@/hooks/use-catalog';
import { isOfflineMode, spendOfflineBalance } from '@/lib/offline';
import { findModel, formatFollowers, formatRm, REVEAL_PANELS, revealLpPerTap, type ModelProfile } from '@/lib/social-data';

type RevealPageProps = { user?: any; miner?: any };

const OVERLAY = '/reveal-overlay.jpg';

export default function RevealPage({ user, miner }: RevealPageProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { model, loading } = useModelProfile(id);
  const { state, tapLever, unlockWithRm, revealWithTicket } = useSocialState();
  const [rmConfirm, setRmConfirm] = useState(false);
  const [rmBusy, setRmBusy] = useState(false);
  const [pulse, setPulse] = useState(false);
  const unlocked = Boolean(model && state.unlockedIds.includes(model.id));
  const lpPerTap = model ? revealLpPerTap(model) : 0;
  const progress = model ? (unlocked ? REVEAL_PANELS : Math.min(REVEAL_PANELS, state.revealProgress[model.id] || 0)) : 0;
  const panelsLeft = REVEAL_PANELS - progress;
  const rmBalance = user?.balance ?? miner?.balance ?? 0;

  useEffect(() => {
    if (!pulse) return;
    const timer = window.setTimeout(() => setPulse(false), 360);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  if (loading) {
    return <SocialShell user={user} miner={miner}><div data-testid="reveal-loading" className="mx-auto mt-24 flex flex-col items-center gap-3 text-muted-foreground"><Loader2 className="size-8 animate-spin text-primary" /><p className="font-mono text-xs uppercase tracking-widest">Tuning in…</p></div></SocialShell>;
  }

  if (!model) {
    return <SocialShell user={user} miner={miner}><div data-testid="empty-reveal-model" className="mx-auto max-w-lg rounded-[28px] border border-dashed border-border p-12 text-center"><CircleAlert className="mx-auto size-9 text-destructive" /><h1 className="mt-4 font-display text-2xl font-bold">That signal is out of range</h1><Link href="/explore" data-testid="link-return-explore-missing" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Back to Models <ChevronRight className="size-4" /></Link></div></SocialShell>;
  }

  const tap = () => {
    if (unlocked || state.lpBalance < lpPerTap) return;
    tapLever(model);
    setPulse(true);
  };

  const startRmUnlock = () => {
    if (rmBusy || rmBalance < model.rmCost) return;
    setRmConfirm(true);
  };

  const confirmRmUnlock = () => {
    if (rmBusy || rmBalance < model.rmCost) return;
    setRmBusy(true);
    window.setTimeout(() => {
      if (isOfflineMode()) spendOfflineBalance(model.rmCost);
      unlockWithRm(model);
      setRmBusy(false);
      setRmConfirm(false);
    }, 700);
  };

  // Horizontal panels (bottom → top reveal). A strip is "lifted" once its
  // bottom-up rank is within progress. Behind them sits the real cover, fully
  // visible the moment a strip lifts — no blur, just the image under the overlay.
  const strips = Array.from({ length: REVEAL_PANELS }, (_, i) => (REVEAL_PANELS - i) <= progress);

  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title="Reveal" backHref="/explore" />
      <div className="mt-3 animate-rise">
        <section className="relative overflow-hidden rounded-[26px] border border-primary/20 bg-[#0c171b] p-3">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] bg-[#152328]">
            {/* Real profile pic behind, always sharp, revealed as panels lift */}
            <img src={model.avatar} alt={`Editorial preview for ${model.name}`} className="absolute inset-0 size-full object-cover" />
            {/* Overlay-image panels: 5 full-cover copies clipped to bands; the bottom band lifts first.
                The opaque bg behind each closed panel hides the profile pic if the overlay JPG is slow. */}
            {strips.map((open, i) => (
              <div
                key={`${model.id}-panel-${i}`}
                aria-hidden={open}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-out ${open ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
                style={{ backgroundColor: '#0a1417', backgroundImage: `url(${OVERLAY})`, clipPath: `inset(${(i * 100) / REVEAL_PANELS}% 0 ${((REVEAL_PANELS - 1 - i) * 100) / REVEAL_PANELS}% 0)` }}
              />
            ))}
            {/* Legibility scrim above the overlay for the caption */}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a1417]/80 via-[#0a1417]/30 to-transparent" />
            {unlocked && <div data-testid="status-reveal-complete" className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-primary/35 bg-[#071113]/75 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-primary backdrop-blur-md"><Check className="size-3.5" /> Signal revealed</div>}
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
              {/* Primary tag (tags[0]) — solid accent bg, first position */}
              {model.tags[0] && <span className="shrink-0 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#071113]" style={{ backgroundColor: model.accent }}>#{model.tags[0]}</span>}
              <div className="flex flex-wrap justify-end gap-1.5">
                {model.tags.slice(1, 4).map((tag) => (
                  <span key={tag} className="tag-orange rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-4 sm:px-1"><div><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Reveal progress</p><p data-testid="text-reveal-progress" className="mt-1 font-display text-xl font-bold">{progress} <span className="text-sm font-normal text-muted-foreground">/ {REVEAL_PANELS} panels</span></p></div><div className="flex gap-1.5">{strips.map((open, index) => <span key={`progress-${index}`} className={`h-1.5 w-7 rounded-full transition-colors duration-300 ${open ? 'bg-primary' : 'bg-secondary'}`} />)}</div></div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-2.5">
          {/* Leverage handle */}
          <div className={`flex min-h-[184px] flex-col rounded-2xl border border-primary/20 bg-primary/[.06] p-4 transition-transform ${pulse ? 'scale-[1.015]' : ''}`}>
            <div className="flex items-center gap-2 text-primary"><Zap className="size-4" /><span className="font-mono text-[10px] uppercase tracking-widest">Leverage handle</span></div>
            <p data-testid="text-reveal-lp-balance" className="mt-2 font-mono text-xs text-accent">{state.lpBalance} LP left</p>
            <p className="mt-3 font-display text-xl font-bold leading-tight">{unlocked ? 'The signal is yours.' : progress ? `${panelsLeft} more tap${panelsLeft === 1 ? '' : 's'}` : 'One tap. One panel.'}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Each tap costs <span className="font-semibold text-accent">{lpPerTap} LP</span></p>
            <button data-testid="button-tap-leverage" onClick={tap} disabled={unlocked || state.lpBalance < lpPerTap} className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className="size-4" />{unlocked ? 'Fully revealed' : state.lpBalance < lpPerTap ? `Need ${lpPerTap} LP` : 'Tap to reveal'}</button>
            {!unlocked && state.lpBalance < lpPerTap && <p data-testid="status-reveal-no-lp" className="mt-2 text-[11px] text-accent">Watch a rewarded ad in Models to recharge LP.</p>}
          </div>

          {/* Direct unlock */}
          <div className="flex min-h-[184px] flex-col rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-accent"><Coins className="size-4" /><span className="font-mono text-[10px] uppercase tracking-widest">Direct unlock</span></div>
            <p className="mt-3 font-display text-xl font-bold leading-tight">Skip the ritual</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Use mined RM Coin to open everything now.</p>
            <p className="mt-2 font-display text-lg font-bold text-accent">{formatRm(model.rmCost)} RM</p>
            <div className="mt-auto">
              {!unlocked && !rmConfirm && <button data-testid="button-start-rm-unlock" onClick={startRmUnlock} disabled={rmBalance < model.rmCost} className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-3 text-sm font-bold text-accent disabled:cursor-not-allowed disabled:opacity-40">{rmBalance < model.rmCost ? `Need ${(model.rmCost - rmBalance).toFixed(1)} RM` : `Unlock ${formatRm(model.rmCost)} RM`} <ChevronRight className="size-4" /></button>}
              {rmConfirm && !rmBusy && <div className="rounded-xl border border-accent/25 bg-accent/[.06] p-2.5"><p data-testid="status-rm-confirm" className="text-[11px] leading-relaxed text-muted-foreground">Confirm unlock for {formatRm(model.rmCost)} RM. Server balance unchanged.</p><div className="mt-2 flex gap-2"><button data-testid="button-cancel-rm-unlock" onClick={() => setRmConfirm(false)} className="flex-1 rounded-lg bg-secondary px-2 py-2 text-[11px] font-semibold">Cancel</button><button data-testid="button-confirm-rm-unlock" onClick={confirmRmUnlock} className="flex-1 rounded-lg bg-accent px-2 py-2 text-[11px] font-bold text-accent-foreground">Confirm</button></div></div>}
              {rmBusy && <div data-testid="status-rm-unlock-loading" className="flex items-center justify-center gap-2 rounded-xl bg-accent/[.06] p-3 text-[11px] text-accent"><Loader2 className="size-4 animate-spin" /> Verifying…</div>}
            </div>
          </div>
        </section>

        {/* Ticket Unlocker — full width, spend 1 model ticket to reveal instantly */}
        {!unlocked && (
          <section className="mt-3 flex flex-col rounded-2xl border border-primary/20 bg-primary/[.06] p-4">
            <div className="flex items-center gap-2 text-primary"><Ticket className="size-4" /><span className="font-mono text-[10px] uppercase tracking-widest">Ticket Unlocker</span></div>
            <p className="mt-2 font-display text-xl font-bold leading-tight">Reveal with a model ticket</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Spend 1 model ticket (from wheel spins) to unlock {model.name} instantly — no LP, no RM.</p>
            <button
              data-testid="button-reveal-ticket"
              onClick={() => revealWithTicket(model)}
              disabled={state.modelTickets < 1}
              className="grad-cta mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Ticket className="size-4" /> {state.modelTickets > 0 ? `Unlock with ticket (${state.modelTickets})` : 'No model tickets'}
            </button>
          </section>
        )}

        {unlocked && <Link href={`/model/${model.id}`} data-testid={`link-open-model-${model.id}`} className="grad-cta mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-transform active:scale-[.98]">Open {model.name}'s profile <ChevronRight className="size-4" /></Link>}
        <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><Sparkles className="size-3.5 text-primary" /> {formatFollowers(model.followers)} followers are already listening.</p>
      </div>
    </SocialShell>
  );
}
