import { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { recentStyles, STYLES } from '@/lib/social-data';

type StylesPageProps = { user?: any; miner?: any };

export default function StylesPage({ user, miner }: StylesPageProps) {
  // Story row = 10 most recently posted styles, newest first (left).
  const recent = useMemo(() => recentStyles(10), []);
  // Grid = a random sample of 10 styles each mount.
  const [sample] = useState(() => [...STYLES].sort(() => Math.random() - 0.5).slice(0, 10));
  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title="Styles" balance={user?.balance ?? miner?.balance ?? 0} />
      <div className="mt-3 animate-rise">
        {/* Horizontal story row (Instagram-style) — newest styles first */}
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {recent.map((style) => (
            <Link key={style.id} href={`/styles/${style.id}`} className="flex w-16 shrink-0 snap-start flex-col items-center gap-1.5">
              <span className="story-ring"><span className="story-inner block size-[58px]"><img src={style.image} alt={style.name} className="size-full object-cover" /></span></span>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">{style.name}</span>
            </Link>
          ))}
        </div>

        {/* Section header */}
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.22em] text-primary">Browse by mood</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Styles</h2>
          </div>
          <span className="text-xs text-muted-foreground">{sample.length} of {STYLES.length} shown</span>
        </div>

        {/* 2-column grid of style tiles */}
        <section className="mt-4 grid grid-cols-2 gap-2.5">
          {sample.map((style) => (
            <Link key={style.id} href={`/styles/${style.id}`} data-testid={`tile-style-${style.id}`} className="group relative block aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card">
              <img src={style.image} alt={style.name} className="size-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071113] via-[#071113]/10 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{style.name}</p>
                  <p className="truncate text-[10px] text-white/65">{style.blurb}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          ))}
        </section>
      </div>
    </SocialShell>
  );
}
