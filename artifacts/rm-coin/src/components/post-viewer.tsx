import { useState, useEffect } from 'react';
import { Bookmark, Check, Eye, Flame, Play, Share2, Sparkles, UserPlus, Users, Volume2, VolumeX, X } from 'lucide-react';
import { Link } from 'wouter';
import { useSocialState } from '@/hooks/use-social-state';
import { formatFollowers, type ModelProfile, type SocialPost } from '@/lib/social-data';

type ViewerItem = { model: ModelProfile; post: SocialPost };

type PostViewerProps = {
  items: ViewerItem[];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Instagram-style full-screen, vertically scrollable post viewer constrained to
 * the app frame (sits between the status bar and the bottom tab bar).
 * - Media fills each screen; vertical action rail (like/save/share) on the right.
 * - Caption (with "Read more") at the bottom; scrolling/wheeling switches posts.
 * - Double-tap / double-click zooms the image.
 */
export function PostViewer({ items, startIndex, open, onOpenChange }: PostViewerProps) {
  const { state, toggleList, toggleMute, recordView } = useSocialState();
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(false);

  const item = items[index];
  const post = item?.post;
  const model = item?.model;

  useEffect(() => {
    if (open) {
      setIndex(startIndex);
      window.setTimeout(() => {
        const el = document.getElementById(`pv-post-${startIndex}`);
        el?.scrollIntoView({ block: 'center' });
      }, 0);
    }
  }, [open, startIndex]);

  // Record a view each time the active post changes (while the viewer is open).
  useEffect(() => {
    if (open && post) recordView(post.id);
  }, [open, index, post, recordView]);

  useEffect(() => {
    if (!open) return;
    setZoom(false);
  }, [index, open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Wheel switches posts vertically (Instagram behaviour).
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById('pv-scroll');
    if (!el) return;
    let locked = false;
    const onWheel = (e: WheelEvent) => {
      if (locked || zoom) return;
      if (Math.abs(e.deltaY) < 24) return;
      locked = true;
      if (e.deltaY > 0) setIndex((i) => Math.min(items.length - 1, i + 1));
      else setIndex((i) => Math.max(0, i - 1));
      window.setTimeout(() => (locked = false), 320);
    };
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, items.length, zoom]);

  if (!open || !post || !model) return null;

  const isLast = index === items.length - 1;

  return (
    <div className="app-viewer-overlay" data-testid="post-viewer-overlay" onClick={() => onOpenChange(false)}>
      <div
        className="app-viewer"
        data-testid="post-viewer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close */}
        <button
          data-testid="button-close-post-viewer"
          onClick={() => onOpenChange(false)}
          aria-label="Close post"
          className="absolute right-3 top-3 z-30 flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75"
        >
          <X className="size-5" />
        </button>

        {/* Scrollable post stack */}
        <div id="pv-scroll" data-testid="post-viewer-scroll" className="app-viewer-scroll">
          {items.map((it, i) => {
            const p = it.post;
            const m = it.model;
            const pHot = state.hotPostIds.includes(p.id);
            const pSaved = state.savedPostIds.includes(p.id);
            const pFollowing = state.followingIds.includes(m.id);
            return (
              <section
                id={`pv-post-${i}`}
                key={`${m.id}-${p.id}`}
                data-testid={`viewer-post-${p.id}`}
                className={`relative flex h-full w-full snap-start items-center justify-center overflow-hidden bg-black`}
              >
                {/* Top bar: handle + follow */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/75 to-transparent px-4 pb-8 pt-14">
                  <Link href={`/model/${m.id}`} data-testid={`link-viewer-profile-${m.id}`} className="pointer-events-auto flex items-center gap-3">
                    <img src={m.avatar} alt={`${m.name} portrait`} className="size-9 rounded-full object-cover ring-2 ring-white/20" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-white">{m.name}</p>
                      <p className="text-[11px] text-white/60">{m.handle}</p>
                    </div>
                  </Link>
                  <button
                    data-testid="button-viewer-follow"
                    onClick={() => toggleList('followingIds', m.id)}
                    className={`pointer-events-auto ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${pFollowing ? 'border border-white/25 text-white/70' : 'bg-primary text-primary-foreground'}`}
                  >
                    {pFollowing ? <><Check className="size-3.5" /> Following</> : <><UserPlus className="size-3.5" /> Follow</>}
                  </button>
                </div>

                {/* Media (double-tap to zoom) */}
                <div className="flex h-full w-full items-center justify-center overflow-auto" onDoubleClick={() => i === index && setZoom((v) => !v)}>
                  {p.type === 'video' && p.video ? (
                    <video
                      key={`${p.id}-${state.muted}`}
                      src={p.video}
                      poster={p.image}
                      controls={false}
                      autoPlay={i === index}
                      loop
                      muted={state.muted}
                      className={`max-h-full w-full select-none object-contain transition-transform duration-200 ${zoom && i === index ? 'scale-[1.8] cursor-zoom-out' : 'cursor-zoom-in'}`}
                    />
                  ) : (
                    <img
                      src={p.image}
                      alt={p.caption}
                      className={`max-h-full w-full select-none object-contain transition-transform duration-200 ${zoom && i === index ? 'scale-[1.8] cursor-zoom-out' : 'cursor-zoom-in'}`}
                    />
                  )}
                </div>
                {p.type === 'video' && (
                  <span data-testid="text-viewer-video" className="absolute right-4 top-14 rounded-full bg-black/60 px-2 py-1 font-mono text-[10px] text-white">
                    {p.duration} · motion
                  </span>
                )}

                {/* Right action rail */}
                <div className="absolute bottom-7 right-3 z-20 flex flex-col items-center gap-5">
                  <button
                    data-testid="button-viewer-like"
                    onClick={() => toggleList('hotPostIds', p.id)}
                    className={`flex flex-col items-center gap-1 ${pHot ? 'text-[#ff5a2c]' : 'text-white'}`}
                  >
                    <Flame className={`size-7 ${pHot ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-semibold">{(p.likes + (pHot ? 1 : 0)).toLocaleString()}</span>
                  </button>
                  <button
                    data-testid="button-viewer-save"
                    onClick={() => toggleList('savedPostIds', p.id)}
                    aria-label={pSaved ? 'Remove from saved' : 'Save post'}
                    className={`flex flex-col items-center gap-1 ${pSaved ? 'text-primary' : 'text-white'}`}
                  >
                    <Bookmark className={`size-7 ${pSaved ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-semibold">{pSaved ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    data-testid="button-viewer-views"
                    aria-label="View count"
                    className="flex flex-col items-center gap-1 text-white"
                  >
                    <Eye className="size-7" />
                    <span className="text-[10px] font-semibold">{((state.viewCounts[p.id] || 0) + 1).toLocaleString()}</span>
                  </button>
                  <button
                    data-testid="button-viewer-mute"
                    onClick={toggleMute}
                    aria-label={state.muted ? 'Unmute posts' : 'Mute posts'}
                    className={`flex flex-col items-center gap-1 ${state.muted ? 'text-primary' : 'text-white'}`}
                  >
                    {state.muted ? <VolumeX className="size-7" /> : <Volume2 className="size-7" />}
                    <span className="text-[10px] font-semibold">{state.muted ? 'Muted' : 'Sound'}</span>
                  </button>
                  <button
                    data-testid="button-viewer-share"
                    onClick={() => window.alert('Share links are local to this prototype.')}
                    aria-label="Share post"
                    className="flex flex-col items-center gap-1 text-white"
                  >
                    <Share2 className="size-7" />
                    <span className="text-[10px] font-semibold">Share</span>
                  </button>
                </div>

                {/* Caption at bottom with Read more */}
                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-4 pt-16">
                  <p data-testid={`text-viewer-caption-${p.id}`} className="text-[13px] leading-snug text-white">
                    <span className="font-semibold">{m.name}</span>{' '}
                    <ExpandableCaption text={p.caption} />
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/55">
                    <Sparkles className="size-3 text-primary" /> {p.posted} · {formatFollowers(m.followers)} followers
                    {isLast && <span className="ml-auto">· End of signal</span>}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ExpandableCaption({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const needsMore = text.length > 90;
  return (
    <>
      {open || !needsMore ? text : `${text.slice(0, 88)}… `}
      {needsMore && (
        <button onClick={() => setOpen((v) => !v)} className="font-semibold text-white/70">
          {open ? 'Less' : 'Read more'}
        </button>
      )}
    </>
  );
}
