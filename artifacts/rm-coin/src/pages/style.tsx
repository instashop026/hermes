import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Layers, Play, UserPlus } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { PostViewer } from '@/components/post-viewer';
import { useSocialState } from '@/hooks/use-social-state';
import { findStyleDef, postsByStyle, type ModelProfile, type SocialPost } from '@/lib/social-data';

type ViewerItem = { model: ModelProfile; post: SocialPost };

type StylePageProps = { user?: any; miner?: any };

function PostTile({ item, index, unlocked, onOpen }: { item: { model: any; post: any }; index: number; unlocked: boolean; onOpen: (id: string) => void }) {
  const { post } = item;
  return (
    <article data-testid={`style-post-${post.id}`} className={`group overflow-hidden rounded-2xl border border-border/70 bg-card ${post.type === 'video' ? 'row-span-2' : ''}`}>
      <button type="button" disabled={!unlocked} data-testid={`button-open-style-post-${post.id}`} onClick={() => unlocked && onOpen(post.id)} className={`relative block w-full overflow-hidden ${post.type === 'video' ? 'aspect-[3/5]' : 'aspect-square'}`}>
        <img src={post.image} alt={post.caption} className={`size-full object-cover transition duration-500 group-hover:scale-[1.03] ${unlocked ? '' : 'blur-[7px] scale-110'}`} />
        {post.type === 'video' && unlocked && <span className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full border border-white/25 bg-[#071113]/60 text-white backdrop-blur-md"><Play className="ml-0.5 size-4 fill-current" /></span>}
        {unlocked ? (
          <div className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between"><span className="truncate text-[11px] font-semibold text-white drop-shadow">{item.model.name}</span></div>
        ) : (
          <div className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2"><span className="truncate text-[11px] font-semibold text-white drop-shadow">Unrevealed shot</span></div>
        )}
      </button>
      {!unlocked && (
        <Link href={`/reveal/${item.model.id}`} data-testid={`button-reveal-model-${item.model.id}`} className="flex w-full items-center justify-center gap-1.5 bg-accent/15 py-2.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent/25">
          Reveal model
        </Link>
      )}
    </article>
  );
}

export default function StylePage({ user, miner }: StylePageProps) {
  const { id } = useParams<{ id: string }>();
  const style = findStyleDef(id);
  const { state, toggleList } = useSocialState();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image'>('all');

  const allItems: ViewerItem[] = postsByStyle(id ?? '');
  const visibleItems = useMemo(
    () => (mediaFilter === 'all' ? allItems : allItems.filter((it) => it.post.type === mediaFilter)),
    [allItems, mediaFilter],
  );

  const followingStyle = style ? state.followedStyles.includes(style.id) : false;

  const openPost = (postId: string) => {
    const idx = visibleItems.findIndex((it) => it.post.id === postId);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

  if (!style) {
    return (
      <SocialShell user={user} miner={miner}>
        <SocialTopBar title="Styles" balance={user?.balance ?? miner?.balance ?? 0} />
        <div className="py-16 text-center">
          <Layers className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Style not found</h1>
          <Link href="/styles" data-testid="link-back-styles-missing" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><ArrowLeft className="size-4" /> All styles</Link>
        </div>
      </SocialShell>
    );
  }

  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title={style.name} backHref="/styles" balance={user?.balance ?? miner?.balance ?? 0} />
      <div className="mt-3 animate-rise">
        {/* Style hero */}
        <section className="relative overflow-hidden rounded-[26px] border border-border bg-card">
          <div className="relative h-40 overflow-hidden">
            <img src={style.image} alt={style.name} className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c171b] via-transparent to-transparent" />
          </div>
          <div className="relative px-5 pb-5 pt-4">
            <div className="flex items-center gap-2 text-primary"><Layers className="size-4" /><span className="font-mono text-[10px] uppercase tracking-widest">Style</span></div>
            <h1 className="mt-2 font-display text-3xl font-bold">{style.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{style.blurb}</p>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{visibleItems.length} posts tagged</p>
              <button data-testid={`button-follow-style-${style.id}`} onClick={() => toggleList('followedStyles', style.id)} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${followingStyle ? 'border border-primary/30 bg-primary/10 text-primary' : 'bg-primary text-primary-foreground'}`}>{followingStyle ? <Check className="size-4" /> : <UserPlus className="size-4" />}{followingStyle ? 'Following' : 'Follow'}</button>
            </div>
          </div>
        </section>

        {/* Filter */}
        <div className="mt-4 flex rounded-full border border-border/70 bg-card p-1" data-testid="tabs-style-media">
          {(['all', 'video', 'image'] as const).map((f) => (
            <button key={f} data-testid={`tab-style-media-${f}`} onClick={() => setMediaFilter(f)} className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition-colors ${mediaFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{f === 'image' ? 'Imgs' : f}</button>
          ))}
        </div>

        {/* Posts grid */}
        {visibleItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
            <Layers className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">No posts in this style yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Reveal more models to grow this feed.</p>
          </div>
        ) : (
          <section className="mt-4 grid grid-cols-2 gap-2.5 [grid-auto-flow:row_dense]">
            {visibleItems.map((item, index) => (
              <PostTile key={item.post.id} item={item} index={index} unlocked={state.unlockedIds.includes(item.model.id)} onOpen={openPost} />
            ))}
          </section>
        )}
      </div>

      {visibleItems.length > 0 && (
        <PostViewer items={visibleItems} startIndex={viewerIndex} open={viewerOpen} onOpenChange={setViewerOpen} />
      )}
    </SocialShell>
  );
}
