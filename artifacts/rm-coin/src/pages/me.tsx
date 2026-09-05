import { ArrowLeft, Layers, Sparkles, Users } from 'lucide-react';
import { Link } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { useSocialState } from '@/hooks/use-social-state';
import { useCatalog } from '@/hooks/use-catalog';
import { formatFollowers, MODEL_PROFILES, STYLES } from '@/lib/social-data';

type MePageProps = { user?: any; miner?: any };

export default function MePage({ user, miner }: MePageProps) {
  const { state } = useSocialState();
  const { models: catalogModels } = useCatalog();
  // Resolve a model id against the merged catalog (static + admin/DB models).
  const modelById = (id: string) => catalogModels.find((m) => m.id === id);
  const profile = user ?? {};
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const name = fullName || profile.username || "You";
  const handle = profile.username ? `@${profile.username}` : (profile.firstName ? `@${profile.firstName}` : "");
  const avatar = profile.photoUrl || MODEL_PROFILES[0]?.avatar;

  const revealedModels = state.unlockedIds.map((id) => modelById(id)).filter((m): m is NonNullable<typeof m> => Boolean(m));
  const followedModels = state.followingIds.map((id) => modelById(id)).filter((m): m is NonNullable<typeof m> => Boolean(m));
  const followedStyles = STYLES.filter((s) => state.followedStyles.includes(s.id));

  const rmBalance = user?.balance ?? miner?.balance ?? 0;

  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title="Me" balance={user?.balance ?? miner?.balance ?? 0} />
      <div className="mt-3 animate-rise">
        <section className="relative overflow-hidden rounded-[30px] border border-border bg-card">
          <div className="relative h-36 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-primary/[.25] via-card to-accent/[.18]" /><div className="absolute inset-0 grid-lines opacity-40" /></div>
          <div className="relative px-5 pb-6">
            <div className="-mt-12 flex flex-col items-center text-center">
              <span data-testid="img-me-avatar" className="size-24 shrink-0 overflow-hidden rounded-full border-4 border-[#0c171b] bg-card">
                <img src={avatar} alt={name} className="aspect-square size-full object-cover" />
              </span>
              <div className="mt-3">
                <Link href="/explore" data-testid="link-me-models" className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary/70">Manage signals</Link>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="font-display text-2xl font-bold">{name}</p>
              {handle && <p className="mt-0.5 text-sm text-muted-foreground">{handle}</p>}
            </div>
            <div className="mt-5 flex justify-center gap-6 text-center">
              <div><p className="font-display text-xl font-bold">{revealedModels.length}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">revealed</p></div>
              <div><p className="font-display text-xl font-bold">{followedModels.length}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">following</p></div>
              <div><p className="font-display text-xl font-bold">{followedStyles.length}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">styles</p></div>
            </div>
          </div>
        </section>

        {/* Balances */}
        <section className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="social-card flex flex-col items-center gap-1 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">RM Coin</p>
            <p data-testid="text-me-rm" className="font-display text-2xl font-bold text-primary">{rmBalance.toFixed(2)}</p>
          </div>
          <div className="social-card flex flex-col items-center gap-1 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">LP Coin</p>
            <p data-testid="text-me-lp" className="font-display text-2xl font-bold text-accent">{state.lpBalance.toFixed(1)}</p>
          </div>
          <div className="social-card flex flex-col items-center gap-1 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Model tickets</p>
            <p data-testid="text-me-model-tickets" className="font-display text-2xl font-bold">{state.modelTickets}</p>
          </div>
          <div className="social-card flex flex-col items-center gap-1 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Shot tickets</p>
            <p data-testid="text-me-shot-tickets" className="font-display text-2xl font-bold">{state.shotTickets}</p>
          </div>
        </section>

        {/* Revealed models */}
        <div className="mt-8">
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><h2 className="font-display text-xl font-bold">Revealed models</h2></div>
          {revealedModels.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No models revealed yet. Head to Models to start.</p>
          ) : (
            <section className="mt-4 grid grid-cols-3 gap-2.5">
              {revealedModels.map((m) => (
                <Link key={m.id} href={`/model/${m.id}`} data-testid={`tile-me-revealed-${m.id}`} className="group relative block aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <img src={m.avatar} alt={m.name} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071113] via-transparent to-transparent" />
                  <p className="absolute inset-x-2 bottom-2 truncate text-[11px] font-semibold text-white">{m.name}</p>
                </Link>
              ))}
            </section>
          )}
        </div>

        {/* Followed models */}
        <div className="mt-8">
          <div className="flex items-center gap-2"><Users className="size-4 text-primary" /><h2 className="font-display text-xl font-bold">Following</h2></div>
          {followedModels.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You are not following anyone yet.</p>
          ) : (
            <section className="mt-4 grid grid-cols-3 gap-2.5">
              {followedModels.map((m) => (
                <Link key={m.id} href={`/model/${m.id}`} data-testid={`tile-me-followed-${m.id}`} className="group relative block aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <img src={m.avatar} alt={m.name} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071113] via-transparent to-transparent" />
                  <p className="absolute inset-x-2 bottom-2 truncate text-[11px] font-semibold text-white">{m.name}</p>
                </Link>
              ))}
            </section>
          )}
        </div>

        {/* Followed styles */}
        <div className="mt-8">
          <div className="flex items-center gap-2"><Layers className="size-4 text-primary" /><h2 className="font-display text-xl font-bold">Followed styles</h2></div>
          {followedStyles.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No styles followed yet.</p>
          ) : (
            <section className="mt-4 grid grid-cols-2 gap-2.5">
              {followedStyles.map((s) => (
                <Link key={s.id} href={`/styles/${s.id}`} data-testid={`tile-me-style-${s.id}`} className="group relative block aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <img src={s.image} alt={s.name} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071113] via-[#071113]/10 to-transparent" />
                  <p className="absolute inset-x-3 bottom-3 text-sm font-semibold text-white">{s.name}</p>
                </Link>
              ))}
            </section>
          )}
        </div>
      </div>
    </SocialShell>
  );
}
