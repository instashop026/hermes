import { useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, Check, Heart, Layers, Loader2, Play, Share2, Sparkles, UserPlus, Users } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { SocialShell, SocialTopBar } from '@/components/social-shell';
import { PostViewer } from '@/components/post-viewer';
import { useSocialState } from '@/hooks/use-social-state';
import { useModelProfile } from '@/hooks/use-catalog';
import { findModel, formatFollowers, postedMinutes, postViews, STYLES, type SocialPost } from '@/lib/social-data';

type ModelPageProps = { user?: any; miner?: any };

function PostCard({ post, index, liked, saved, onOpen, onSave }: { post: SocialPost; index: number; liked: boolean; saved: boolean; onOpen: (i: number) => void; onSave: () => void }) {
  const isVideo = post.type === 'video';
  return (
    <article data-testid={`card-post-${post.id}`} className={`group overflow-hidden rounded-2xl border border-border bg-card ${isVideo ? 'row-span-2' : ''}`}>
      <button type="button" data-testid={`button-open-post-${post.id}`} onClick={() => onOpen(index)} className={`relative block w-full overflow-hidden ${isVideo ? 'aspect-[3/5]' : 'aspect-square'}`}>
        <img src={post.image} alt={post.caption} className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        {isVideo && <span data-testid={`text-video-duration-${post.id}`} className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full border border-white/25 bg-[#071113]/60 text-white backdrop-blur-md"><Play className="ml-0.5 size-4 fill-current" /></span>}
      </button>
    </article>
  );
}

// helper kept local to avoid restructuring the toggleList usage at call sites
export default function ModelPage({ user, miner }: ModelPageProps) {
  const { id } = useParams<{ id: string }>();
  const { model, loading } = useModelProfile(id);
  const { state, toggleList } = useSocialState();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image'>('all');
  const [sortMode, setSortMode] = useState<'latest' | 'oldest' | 'hottest' | 'views'>('latest');

  const sortLabel: Record<typeof sortMode, string> = { latest: 'Latest', oldest: 'Oldest', hottest: 'Hottest', views: 'Most viewed' };

  const visiblePosts = useMemo(() => {
    const posts = model?.posts ?? [];
    const base = mediaFilter === 'all' ? posts : posts.filter((p) => p.type === mediaFilter);
    const hot = new Set(state.hotPostIds);
    const sorted = [...base];
    if (sortMode === 'latest') sorted.sort((a, b) => posts.indexOf(a) - posts.indexOf(b));
    else if (sortMode === 'oldest') sorted.sort((a, b) => postedMinutes(b) - postedMinutes(a));
    else if (sortMode === 'hottest') sorted.sort((a, b) => (b.likes + (hot.has(b.id) ? 5000 : 0)) - (a.likes + (hot.has(a.id) ? 5000 : 0)));
    else sorted.sort((a, b) => postViews(b) - postViews(a));
    return sorted;
  }, [model?.posts, mediaFilter, sortMode, state.hotPostIds]);

  if (loading) {
    return <SocialShell user={user} miner={miner}><div data-testid="model-loading" className="mx-auto mt-24 flex flex-col items-center gap-3 text-muted-foreground"><Loader2 className="size-8 animate-spin text-primary" /><p className="font-mono text-xs uppercase tracking-widest">Loading…</p></div></SocialShell>;
  }

  if (!model) {
    return <SocialShell user={user} miner={miner}><div data-testid="empty-model-profile" className="mx-auto max-w-lg rounded-[28px] border border-dashed border-border p-12 text-center"><Users className="mx-auto size-9 text-muted-foreground" /><h1 className="mt-4 font-display text-2xl font-bold">Profile not found</h1><Link href="/explore" data-testid="link-return-explore-profile-missing" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Return to Models <ArrowLeft className="size-4" /></Link></div></SocialShell>;
  }

  const isUnlocked = state.unlockedIds.includes(model.id);
  const following = state.followingIds.includes(model.id);
  const modelStyles = STYLES.filter((s) => model.posts.some((p) => p.styleIds?.includes(s.id)));

  if (!isUnlocked) {
    return <SocialShell user={user} miner={miner}><SocialTopBar title={model.name} backHref="/explore" /><div className="mx-auto max-w-lg py-12 text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-[22px] border border-accent/30 bg-accent/10 text-accent"><Sparkles className="size-7" /></div><p className="mt-6 font-mono text-[10px] uppercase tracking-[.22em] text-primary">Signal still encrypted</p><h1 className="mt-3 font-display text-4xl font-bold">This profile is behind the curtain.</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Open {model.name}'s signal first, then the full profile and its field notes will be waiting here.</p><Link href={`/reveal/${model.id}`} data-testid={`link-reveal-locked-model-${model.id}`} className="grad-cta mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold">Go to reveal <Sparkles className="size-4" /></Link><div className="mt-6"><Link href="/explore" data-testid="link-back-explore-locked-profile" className="text-xs font-semibold text-muted-foreground hover:text-primary">Back to Models</Link></div></div></SocialShell>;
  }

  const openPost = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <SocialShell user={user} miner={miner}>
      <SocialTopBar title={model.name} backHref="/explore" />
      <div className="mt-3 animate-rise">
        <section className="relative mt-7 overflow-hidden rounded-[30px] border border-border bg-card">
          <div className="relative h-48 overflow-hidden sm:h-64"><img src={model.cover} alt={`${model.name} cover`} className="size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#0c171b] via-[#0c171b]/15 to-transparent" /><div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-[#071113]/60 px-3 py-2 backdrop-blur-md"><Sparkles className="size-3.5 text-primary" /><span className="font-mono text-[10px] uppercase tracking-widest text-white/80">Revealed Model</span></div></div>
          <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between"><div className="flex flex-col gap-4 sm:flex-row sm:items-end"><span data-testid={`img-model-avatar-${model.id}`} className="size-28 shrink-0 overflow-hidden rounded-full border-4 border-[#0c171b] bg-card sm:size-32"><img src={model.avatar} alt={`${model.name} portrait`} className="aspect-square size-full object-cover" /></span><div><p className="font-display text-3xl font-bold">{model.name}</p><p data-testid={`text-model-handle-${model.id}`} className="mt-1 text-sm text-muted-foreground">{model.handle}</p></div></div><div className="flex gap-2"><button data-testid={`button-follow-model-${model.id}`} onClick={() => toggleList('followingIds', model.id)} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${following ? 'border border-primary/30 bg-primary/10 text-primary' : 'bg-primary text-primary-foreground'}`}>{following ? <Check className="size-4" /> : <UserPlus className="size-4" />}{following ? 'Following' : 'Follow'}</button><button data-testid={`button-share-model-${model.id}`} onClick={() => window.alert('Profile share links are local to this prototype.')} aria-label={`Share ${model.name}'s profile`} className="rounded-xl border border-border bg-secondary px-3 text-muted-foreground transition-colors hover:text-foreground"><Share2 className="size-4" /></button></div></div>
            <div className="mt-6 flex flex-col items-center text-center"><p data-testid={`text-model-bio-${model.id}`} className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{model.bio}</p><div className="mt-4 flex flex-wrap justify-center gap-2">{model.tags.map((tag) => <span key={tag} className="tag-orange rounded-full px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider">#{tag}</span>)}</div><div className="mt-5 flex justify-center gap-8"><div><p data-testid={`text-model-followers-${model.id}`} className="font-display text-xl font-bold">{formatFollowers(model.followers)}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">followers</p></div><div><p className="font-display text-xl font-bold">{model.posts.length}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">shots</p></div></div></div>
          </div>
        </section>
        <div className="mt-10 flex flex-col items-center text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Shots</h2>
        </div>

        {/* Filter + sort */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <div data-testid="tabs-model-media" className="flex rounded-full border border-border/70 bg-card p-1">
            {(['all', 'video', 'image'] as const).map((f) => (
              <button key={f} data-testid={`tab-model-media-${f}`} onClick={() => setMediaFilter(f)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition-colors ${mediaFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{f === 'image' ? 'Imgs' : f}</button>
            ))}
          </div>
          <div data-testid="tabs-model-sort" className="flex rounded-full border border-border/70 bg-card p-1">
            {(['latest', 'oldest', 'hottest', 'views'] as const).map((s) => (
              <button key={s} data-testid={`tab-model-sort-${s}`} onClick={() => setSortMode(s)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${sortMode === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{sortLabel[s]}</button>
            ))}
          </div>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-1.5 [grid-auto-flow:row_dense]">{visiblePosts.map((post, index) => <PostCard key={post.id} post={post} index={index} liked={state.likedPostIds.includes(post.id)} saved={state.savedPostIds.includes(post.id)} onOpen={openPost} onSave={() => toggleList('savedPostIds', post.id)} />)}</section>
        {modelStyles.length > 0 && (
          <div className="mt-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-primary"><Layers className="size-3.5" /> Styles</p>
                <h2 className="mt-2 font-display text-2xl font-bold">In this signal</h2>
              </div>
              <Link href="/styles" data-testid="link-all-styles" className="text-xs font-semibold text-primary">All styles <ArrowLeft className="ml-1 inline size-3 rotate-180" /></Link>
            </div>
            <section className="mt-4 grid grid-cols-2 gap-2.5">
              {modelStyles.map((style) => (
                <Link key={style.id} href={`/styles/${style.id}`} data-testid={`tile-model-style-${style.id}`} className="group relative block aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <img src={style.image} alt={style.name} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071113] via-[#071113]/10 to-transparent" />
                  <div className="absolute inset-x-3 bottom-3">
                    <p className="text-sm font-semibold text-white">{style.name}</p>
                    <p className="truncate text-[10px] text-white/65">{style.blurb}</p>
                  </div>
                </Link>
              ))}
            </section>
          </div>
        )}
      </div>
      <PostViewer items={model.posts.map((post) => ({ model, post }))} startIndex={viewerIndex} open={viewerOpen} onOpenChange={setViewerOpen} />
    </SocialShell>
  );
}
