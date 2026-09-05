import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronRight, Flame, Play, Shirt } from 'lucide-react';
import { Link } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { PostViewer } from '@/components/post-viewer';
import { useSocialState } from '@/hooks/use-social-state';
import { useCatalog } from '@/hooks/use-catalog';
import { useDragScroll } from '@/lib/use-drag-scroll';
import { formatFollowers, MODEL_PROFILES, STYLES, modelLastUpdated, recentStyles, type ModelProfile, type SocialPost } from '@/lib/social-data';

type ExploreFeedProps = { user?: any; miner?: any };

type ViewerItem = { model: ModelProfile; post: SocialPost };

export default function ExploreFeed({ user, miner }: ExploreFeedProps) {
  const { state, toggleList } = useSocialState();
  const { models: catalogModels, loading: catalogLoading } = useCatalog();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image'>('all');

  // Every post from every revealed model, exactly once, in source order.
  // Uses the merged catalog (static + admin/DB models).
  const allRevealedItems = useMemo<ViewerItem[]>(
    () => catalogModels.filter((m) => state.unlockedIds.includes(m.id)).flatMap((m) => m.posts.map((post) => ({ model: m, post }))),
    [catalogModels, state.unlockedIds],
  );

  const visibleItems = useMemo(
    () => (mediaFilter === 'all' ? allRevealedItems : allRevealedItems.filter((it) => it.post.type === mediaFilter)),
    [allRevealedItems, mediaFilter],
  );

  const revealed = useMemo(() => catalogModels.filter((m) => state.unlockedIds.includes(m.id)).sort((a, b) => modelLastUpdated(a) - modelLastUpdated(b)), [catalogModels, state.unlockedIds]);
  const hidden = useMemo(() => catalogModels.filter((m) => !state.unlockedIds.includes(m.id)), [catalogModels, state.unlockedIds]);
  const stylesRow = useMemo(() => recentStyles(STYLES.length), []);
  const modelsRowRef = useDragScroll<HTMLDivElement>();
  const stylesRowRef = useDragScroll<HTMLDivElement>();

  // When opened with ?reveal=1, scroll down to the reveal gateway.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let t: number | undefined;
    if (params.get('reveal') === '1') {
      t = window.setTimeout(() => document.getElementById('reveal-gateway')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, []);

  const openPost = (postId: string) => {
    const idx = visibleItems.findIndex((it) => it.post.id === postId);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title="Explore" />
      <div className="mt-3">
        {revealed.length === 0 && !catalogLoading ? (
          <div id="reveal-gateway" className="mt-2 rounded-2xl border border-dashed border-border bg-card/60 p-7 text-center">
            <Shirt className="mx-auto size-8 text-accent" />
            <h2 className="mt-3 font-display text-xl font-bold">No revealed models yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Reveal a profile to start building your feed.</p>
            <Link href="/explore" data-testid="button-goto-reveal-gateway" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Go to Models <ArrowUpRight className="size-4" /></Link>
          </div>
        ) : (
          <>
            {/* Revealed models story row (horizontal, Instagram-style) */}
            <div ref={modelsRowRef} className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {revealed.map((model) => (
                <Link key={model.id} href={`/model/${model.id}`} className="flex w-16 shrink-0 snap-start flex-col items-center gap-1.5">
                  <span className="story-ring"><span className="story-inner block size-[58px]"><img src={model.avatar} alt={model.name} className="size-full object-cover" /></span></span>
                  <span className="w-full truncate text-center text-[10px] text-muted-foreground">{model.name.split(' ')[0]}</span>
                </Link>
              ))}
              <Link href="/explore" data-testid="button-row-reveal-more" className="flex w-16 shrink-0 snap-start flex-col items-center gap-1.5">
                <span className="grad-reveal-more flex size-[58px] items-center justify-center rounded-2xl shadow-lg"><ChevronRight className="size-6" /></span>
                <span className="w-full truncate text-center text-[10px] font-semibold text-foreground">reveal more</span>
              </Link>
            </div>

            {/* Styles story row (horizontal, Instagram-style) */}
            <div ref={stylesRowRef} className="no-scrollbar -mx-4 mt-1 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {stylesRow.map((style) => (
                <Link key={style.id} href={`/styles/${style.id}`} className="flex w-16 shrink-0 snap-start flex-col items-center gap-1.5">
                  <span className="story-ring-soft"><span className="story-inner block size-[58px]"><img src={style.image} alt={style.name} className="size-full object-cover" /></span></span>
                  <span className="w-full truncate text-center text-[10px] text-muted-foreground">{style.name}</span>
                </Link>
              ))}
              <Link href="/styles" data-testid="button-row-all-styles" className="flex w-16 shrink-0 snap-start flex-col items-center gap-1.5">
                <span className="grad-all-styles flex size-[58px] items-center justify-center rounded-2xl shadow-lg"><ChevronRight className="size-6" /></span>
                <span className="w-full truncate text-center text-[10px] font-semibold text-foreground">all styles</span>
              </Link>
            </div>

            {/* Filter */}
            <div className="mt-3 flex rounded-full border border-border/70 bg-card p-1" data-testid="tabs-explore-media">
              {(['all', 'video', 'image'] as const).map((f) => (
                <button key={f} data-testid={`tab-explore-media-${f}`} onClick={() => setMediaFilter(f)} className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition-colors ${mediaFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{f === 'image' ? 'Imgs' : f}</button>
              ))}
            </div>

            {/* Feed: every revealed post, once */}
            <section className="mt-3 columns-2 gap-2.5 [column-fill:_balance]">
              {visibleItems.map((item, index) => {
                const hot = state.hotPostIds.includes(item.post.id);
                const liked = state.likedPostIds.includes(item.post.id);
                return (
                  <article key={`${item.model.id}-${item.post.id}`} data-testid={`feed-post-${item.post.id}-${index}`} className="group mb-2.5 break-inside-avoid overflow-hidden rounded-2xl border border-border/70 bg-card">
                    <button type="button" data-testid={`button-open-feed-post-${item.post.id}-${index}`} onClick={() => openPost(item.post.id)} className="relative block w-full overflow-hidden">
                      <img src={item.post.image} alt={item.post.caption} className="w-full object-cover transition duration-500 group-hover:scale-[1.03]" style={{ aspectRatio: item.post.type === 'video' ? '3 / 4' : '4 / 5' }} />
                      {item.post.type === 'video' && <span className="absolute left-2.5 top-2.5 flex size-8 items-center justify-center rounded-full border border-white/25 bg-[#071113]/60 backdrop-blur-md"><Play className="ml-0.5 size-3.5 fill-current text-white" /></span>}
                      <div className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between"><span className="truncate text-[11px] font-semibold text-white drop-shadow">{item.model.name}</span></div>
                    </button>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <button data-testid={`button-like-feed-${item.post.id}-${index}`} onClick={() => toggleList('hotPostIds', item.post.id)} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${hot ? 'text-[#ff5a2c]' : 'text-muted-foreground'}`}><Flame className={`size-4 ${hot ? 'fill-current' : ''}`} />{String(item.post.likes + (hot ? 1 : 0)).toLocaleString()}</button>
                      <Link href={`/model/${item.model.id}`} data-testid={`link-feed-model-${item.model.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Profile <ArrowUpRight className="size-3.5" /></Link>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* End-of-feed / reveal gateway */}
            {visibleItems.length > 0 ? (
              <div id="reveal-gateway" className="mt-6 rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/[.12] to-card p-4 text-center">
                <p className="text-sm font-semibold">There are no more posts here.</p>
                <p className="mt-1 text-xs text-muted-foreground">Reveal more models to get more posts.</p>
                <Link href="/explore" data-testid="button-reveal-more-models" className="grad-accent mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold">Reveal models <ArrowUpRight className="size-3.5" /></Link>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="text-sm font-semibold">No {mediaFilter === 'all' ? '' : mediaFilter === 'video' ? 'videos' : 'images'} in this feed yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Switch the filter or reveal more models.</p>
              </div>
            )}
          </>
        )}

        {visibleItems.length > 0 && (
          <PostViewer items={visibleItems} startIndex={viewerIndex} open={viewerOpen} onOpenChange={setViewerOpen} />
        )}
      </div>
    </SocialShell>
  );
}
