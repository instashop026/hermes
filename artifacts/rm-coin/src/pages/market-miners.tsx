import { Coins, Gem } from 'lucide-react';
import { Link } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { MINERS } from '@/lib/social-data';

type MarketMinersPageProps = { user?: any; miner?: any };

export default function MarketMinersPage({ user, miner }: MarketMinersPageProps) {
  const balance = user?.balance ?? miner?.balance ?? 0;
  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title="Miners" balance={balance} backHref="/market" />
      <div className="mt-3 animate-rise">
        <p className="font-mono text-[10px] uppercase tracking-[.22em] text-primary">Rigs &amp; engines</p>
        <h2 className="mt-1 font-display text-2xl font-bold">Miners</h2>
        <p className="mt-1 text-xs text-muted-foreground">Buy rigs to boost your mining rate.</p>

        <section className="mt-4 grid grid-cols-2 gap-2.5">
          {MINERS.map((it) => {
            const owned = it.cost === 0;
            const can = balance >= it.cost;
            return (
              <div key={it.id} data-testid={`card-miner-${it.id}`} className="flex flex-col rounded-2xl border border-border/70 bg-card p-3">
                <span className="flex aspect-square items-center justify-center rounded-xl" style={{ background: `${it.accent}22`, color: it.accent }}>
                  <Gem className="size-9" />
                </span>
                <p className="mt-2 truncate text-sm font-semibold">{it.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{it.tag}{it.rate ? ` · ${it.rate}` : ''}</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="font-mono text-[11px] text-accent">{owned ? 'Owned' : `${it.cost} RM`}</span>
                  {!owned && (
                    <button disabled={!can} data-testid={`button-buy-miner-${it.id}`} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40">
                      <Coins className="size-3" /> Buy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <Link href="/market" className="mt-5 block text-center text-xs font-semibold text-primary">Back to Market</Link>
      </div>
    </SocialShell>
  );
}
