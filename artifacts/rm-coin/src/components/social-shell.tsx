import { type ReactNode, useEffect, useState } from 'react';
import { Activity, Compass, Home, Pickaxe, ShoppingBag, Sparkles, User, UserRound, Zap } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useWindowDragScroll } from '@/lib/use-drag-scroll';

type SocialShellProps = {
  children: ReactNode;
  user?: any;
  miner?: any;
};

const fmt = (value = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const clock = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Bottom tab navigation — the only navigation surface in the app.
const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/miner', label: 'Mine', icon: Pickaxe },
  { href: '/market', label: 'Market', icon: ShoppingBag },
  { href: '/explore', label: 'Models', icon: UserRound },
  { href: '/explore/feed', label: 'Explore', icon: Compass },
  { href: '/me', label: 'Me', icon: User },
];

function StatusBar() {
  const [time, setTime] = useState(clock());
  useEffect(() => {
    const t = window.setInterval(() => setTime(clock()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="app-statusbar" data-testid="app-statusbar">
      <span className="font-semibold tabular-nums">{time}</span>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary"><Sparkles className="size-3" /> RM</span>
        <span className="sb-signals">
          <span className="sb-bars"><span style={{ height: '5px' }} /><span style={{ height: '7px' }} /><span style={{ height: '9px' }} /><span style={{ height: '11px' }} /></span>
          <span className="sb-dot" />
          <span className="sb-dot" />
          <span className="sb-dot/60" style={{ opacity: 0.5 }} />
        </span>
      </div>
    </div>
  );
}

export function SocialShell({ children, user, miner }: SocialShellProps) {
  const [location] = useLocation();
  useWindowDragScroll();
  return (
    <div className="app-frame noise" data-testid="app-frame">
      <StatusBar />
      <main className="min-h-[calc(100dvh-44px)] pb-[78px]">
        <div className="px-4 pt-4">{children}</div>
      </main>
      <nav className="app-tabbar" data-testid="app-tabbar">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              data-testid={`tab-${label.toLowerCase()}`}
              className={`group ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="tab-ico size-[21px]" strokeWidth={active ? 2.4 : 1.9} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Small inline header used by inner pages (back + title + balance).
export function SocialTopBar({ title, balance, backHref, onBack }: { title?: string; balance?: number; backHref?: string; onBack?: () => void }) {
  return (
    <div className="sticky top-[44px] z-30 -mx-4 mb-2 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {backHref || onBack ? (
          onBack ? (
            <button onClick={onBack} data-testid="button-back" className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70">
              <span className="i" aria-hidden>‹</span>
            </button>
          ) : (
            <Link href={backHref!} data-testid="link-back" className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70">‹</Link>
          )
        ) : null}
        {title ? <h1 className="font-display text-lg font-bold tracking-tight">{title}</h1> : (
          <Link href="/" data-testid="link-social-logo" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Pickaxe className="size-3.5" /></span>
            <span className="font-display text-base font-bold">RM <span className="text-primary">COIN</span></span>
          </Link>
        )}
      </div>
      {typeof balance === 'number' ? (
        <span data-testid="text-social-rm-balance" className="rounded-full border border-border/70 bg-card px-3 py-1.5 font-mono text-[11px] font-semibold text-accent">{fmt(balance)} RM</span>
      ) : null}
    </div>
  );
}
