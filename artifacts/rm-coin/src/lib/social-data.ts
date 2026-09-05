export type SocialPost = {
  id: string;
  type: 'image' | 'video';
  image: string;
  /** Actual video source (with audio) for video posts. Falls back to `image` when absent. */
  video?: string;
  caption: string;
  likes: number;
  posted: string;
  duration?: string;
  /** Style categories this post belongs to (used for filtering in Explore / Styles). */
  styleIds?: string[];
};

export type ModelProfile = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  location: string;
  followers: number;
  /** Total Leverage Points (LP) required to fully reveal this profile via the curtain ritual. */
  revealCostLp: number;
  /** RM Coin cost for an instant direct unlock (primary coin, mined only). */
  rmCost: number;
  tags: string[];
  avatar: string;
  cover: string;
  accent: string;
  posts: SocialPost[];
};

/** Number of curtain panels revealed across the LP ritual. */
export const REVEAL_PANELS = 5;

/** LP spent per curtain tap (rounded up so the total reaches revealCostLp/among panels). */
export const revealLpPerTap = (model: ModelProfile) => Math.ceil(model.revealCostLp / REVEAL_PANELS);

const image = (id: string, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=84`;

export const MODEL_PROFILES: ModelProfile[] = [
  {
    id: 'mara-vale',
    name: 'Mara Vale',
    handle: '@maravale',
    bio: 'Soft focus, hard edges. Collecting quiet rooms and bright mornings.',
    location: 'Lisbon / remote',
    followers: 28400,
    revealCostLp: 30,
    rmCost: 2.5,
    tags: ['editorial', 'slow travel', 'analog'],
    avatar: image('photo-1534528741775-53994a69daeb', 240),
    cover: image('photo-1500534623283-312aade485b7', 1200),
    accent: '#ffbd7d',
    posts: [
      { id: 'mara-01', type: 'image', image: image('photo-1515886657613-9f3515b0c78f'), caption: 'A little sun, a very long walk.', likes: 1842, posted: '2h ago', styleIds: ['editorial', 'beach'] },
      { id: 'mara-02', type: 'video', image: image('photo-1519608487953-e999c86e7455'), caption: 'The last light found us first.', likes: 932, posted: 'Yesterday', duration: '0:18', styleIds: ['studio', 'night'] },
      { id: 'mara-03', type: 'image', image: image('photo-1496747611176-843222e1e57c'), caption: 'Notes from a blue hour.', likes: 2674, posted: '4d ago' },
      { id: 'mara-04', type: 'video', image: image('photo-1496337458700-8f8f7c31d5f8'), video: '/mara-soundcheck.mp4', caption: 'Sound check — turn it up, then mute it from the rail.', likes: 1503, posted: '3h ago', duration: '0:15', styleIds: ['studio', 'editorial'] },
    ],
  },
  {
    id: 'noor-kai',
    name: 'Noor Kai',
    handle: '@noorkai',
    bio: 'Movement, metal, and a camera that never sleeps.',
    location: 'Seoul / Paris',
    followers: 67200,
    revealCostLp: 42,
    rmCost: 3,
    tags: ['motion', 'streetwear', 'night'],
    avatar: image('photo-1524504388940-b1c1722653e1', 240),
    cover: image('photo-1519501025264-65ba15a82390', 1200),
    accent: '#8be6d2',
    posts: [
      { id: 'noor-01', type: 'video', image: image('photo-1506794778202-cad84cf45f1d'), caption: 'Three turns before the city wakes.', likes: 5481, posted: '1h ago', duration: '0:26', styleIds: ['streetwear', 'night'] },
      { id: 'noor-02', type: 'image', image: image('photo-1492562080023-ab3db95bfbce'), caption: 'Chrome in the rain.', likes: 3188, posted: '2d ago', styleIds: ['streetwear'] },
      { id: 'noor-03', type: 'video', image: image('photo-1529139574466-a303027c1d8b'), caption: 'A fitting room, a new rhythm.', likes: 1840, posted: '6d ago', duration: '0:41' },
    ],
  },
  {
    id: 'ivy-sato',
    name: 'Ivy Sato',
    handle: '@ivysato',
    bio: 'A study in texture. Tokyo-born, everywhere-curious.',
    location: 'Tokyo',
    followers: 41300,
    revealCostLp: 35,
    rmCost: 2.5,
    tags: ['texture', 'beauty', 'studio'],
    avatar: image('photo-1488426862026-3ee34a7d66df', 240),
    cover: image('photo-1511818966892-d7d671e672a2', 1200),
    accent: '#f49eb4',
    posts: [
      { id: 'ivy-01', type: 'image', image: image('photo-1524250502761-1ac6f2e30d43'), caption: 'Silk, shadow, and a room with no clock.', likes: 4120, posted: '5h ago', styleIds: ['studio', 'tattoo'] },
      { id: 'ivy-02', type: 'video', image: image('photo-1544005313-94ddf0286df2'), caption: 'Behind the still life.', likes: 2105, posted: '3d ago', duration: '0:33', styleIds: ['studio', 'vintage'] },
      { id: 'ivy-03', type: 'image', image: image('photo-1508214751196-bcfd4ca60f91'), caption: 'The close-up is the whole story.', likes: 1760, posted: '1w ago' },
    ],
  },
  {
    id: 'celeste-rowan',
    name: 'Celeste Rowan',
    handle: '@celesterowan',
    bio: 'Making a little theatre out of the everyday.',
    location: 'New York',
    followers: 12800,
    revealCostLp: 32,
    rmCost: 2,
    tags: ['portrait', 'film', 'city'],
    avatar: image('photo-1531123897727-8f129e1688ce', 240),
    cover: image('photo-1496588152823-86ff7695e68f', 1200),
    accent: '#c4a7ff',
    posts: [
      { id: 'celeste-01', type: 'image', image: image('photo-1539109136881-3be0616acf4b'), caption: 'A scene from the north side.', likes: 820, posted: '3h ago', styleIds: ['editorial', 'vintage'] },
      { id: 'celeste-02', type: 'video', image: image('photo-1529139574466-a303027c1d8b'), caption: 'Costume change in one breath.', likes: 1298, posted: '2d ago', duration: '0:12' },
      { id: 'celeste-03', type: 'image', image: image('photo-1525507119028-ed4c629a60a3'), caption: 'Found objects, found mood.', likes: 938, posted: '5d ago' },
    ],
  },
  {
    id: 'sora-milan',
    name: 'Sora Milan',
    handle: '@soramilan',
    bio: 'Sunlit tailoring and the occasional wrong turn.',
    location: 'Milan',
    followers: 89500,
    revealCostLp: 48,
    rmCost: 3.5,
    tags: ['tailoring', 'design', 'sunlight'],
    avatar: image('photo-1529626455594-4ff0802cfb7e', 240),
    cover: image('photo-1521334884684-d80222895322', 1200),
    accent: '#f4cc77',
    posts: [
      { id: 'sora-01', type: 'video', image: image('photo-1485230895905-ec40ba36b9bc'), caption: 'A jacket built for the long way home.', likes: 6840, posted: '30m ago', duration: '0:22', styleIds: ['streetwear', 'beach'] },
      { id: 'sora-02', type: 'image', image: image('photo-1483985988355-763728e1935b'), caption: 'Between appointments.', likes: 3930, posted: '1d ago', styleIds: ['editorial'] },
      { id: 'sora-03', type: 'image', image: image('photo-1558769132-cb1aea458c5e'), caption: 'The details do the talking.', likes: 2810, posted: '1w ago' },
    ],
  },
  {
    id: 'juno-ardent',
    name: 'Juno Ardent',
    handle: '@junoardent',
    bio: 'Warm weather, sharp silhouettes, zero small talk.',
    location: 'Mexico City',
    followers: 34700,
    revealCostLp: 38,
    rmCost: 2.5,
    tags: ['color', 'architecture', 'heat'],
    avatar: image('photo-1524504388940-b1c1722653e1', 240),
    cover: image('photo-1500530855697-b586d89ba3ee', 1200),
    accent: '#ff8d6b',
    posts: [
      { id: 'juno-01', type: 'image', image: image('photo-1485968579580-b6d095142e6e'), caption: 'Terracotta afternoon.', likes: 1930, posted: '7h ago', styleIds: ['tattoo', 'beach'] },
      { id: 'juno-02', type: 'video', image: image('photo-1485230895905-ec40ba36b9bc'), caption: 'The block is a runway.', likes: 2450, posted: '3d ago', duration: '0:29' },
      { id: 'juno-03', type: 'image', image: image('photo-1531058020387-3be344556be6'), caption: 'A little drama in the doorway.', likes: 1104, posted: '1w ago' },
    ],
  },
  {
    id: 'rhea-sol',
    name: 'Rhea Sol',
    handle: '@rheasol',
    bio: 'Minimal objects, maximum atmosphere.',
    location: 'Copenhagen',
    followers: 22100,
    revealCostLp: 36,
    rmCost: 2.5,
    tags: ['minimal', 'objects', 'north'],
    avatar: image('photo-1534528741775-53994a69daeb', 240),
    cover: image('photo-1497366754035-f200968a6e72', 1200),
    accent: '#a9c7ff',
    posts: [
      { id: 'rhea-01', type: 'image', image: image('photo-1494438639946-1ebd1d20bf85'), caption: 'A desk, after the work is done.', likes: 1612, posted: '9h ago', styleIds: ['minimal', 'studio'] },
      { id: 'rhea-02', type: 'video', image: image('photo-1497366811353-6870744d04b2'), caption: 'Morning light in the atelier.', likes: 1994, posted: '4d ago', duration: '0:37' },
      { id: 'rhea-03', type: 'image', image: image('photo-1494438639946-1ebd1d20bf85'), caption: 'The calm between decisions.', likes: 925, posted: '2w ago' },
    ],
  },
  {
    id: 'elara-west',
    name: 'Elara West',
    handle: '@elarawest',
    bio: 'A restless eye for remote places and good linen.',
    location: 'Cape Town',
    followers: 55600,
    revealCostLp: 40,
    rmCost: 3,
    tags: ['travel', 'linen', 'outdoors'],
    avatar: image('photo-1524504388940-b1c1722653e1', 240),
    cover: image('photo-1507525428034-b723cf961d3e', 1200),
    accent: '#8bd8e8',
    posts: [
      { id: 'elara-01', type: 'video', image: image('photo-1500530855697-b586d89ba3ee'), caption: 'No itinerary, just a horizon.', likes: 3180, posted: '2h ago', duration: '0:45', styleIds: ['beach', 'night'] },
      { id: 'elara-02', type: 'image', image: image('photo-1500534623283-312aade485b7'), caption: 'A road with room to think.', likes: 2220, posted: '3d ago', styleIds: ['editorial' , 'beach'] },
      { id: 'elara-03', type: 'image', image: image('photo-1501785888041-af3ef285b470'), caption: 'Blue hour, somewhere west.', likes: 3750, posted: '1w ago' },
    ],
  },
];

export type StyleDef = {
  id: string;
  name: string;
  blurb: string;
  /** Sample cover image shown in the Styles grid / story ring. */
  image: string;
};

/** Post categories for filtering. Samples for now; originals can replace later. */
export const STYLES: StyleDef[] = [
  { id: 'tattoo', name: 'Tattoo', blurb: 'Ink, skin and stories.', image: image('photo-1537151608889-e09e1ea1a8c8', 600) },
  { id: 'streetwear', name: 'Streetwear', blurb: 'City uniform, oversized.', image: image('photo-1523398002811-999aa4cb6ea8', 600) },
  { id: 'studio', name: 'Studio', blurb: 'Clean light, clean lines.', image: image('photo-1544005313-94ddf0286df2', 600) },
  { id: 'editorial', name: 'Editorial', blurb: 'Magazine mood, made to last.', image: image('photo-1496747611176-843222e1e57c', 600) },
  { id: 'night', name: 'Night', blurb: 'Neon, low light, long exposures.', image: image('photo-1492691527719-9d1e07e534b4', 600) },
  { id: 'beach', name: 'Beach', blurb: 'Salt, sun and soft focus.', image: image('photo-1507525428034-b723cf961d3e', 600) },
  { id: 'minimal', name: 'Minimal', blurb: 'Less object, more atmosphere.', image: image('photo-1494438639946-1ebd1d20bf85', 600) },
  { id: 'vintage', name: 'Vintage', blurb: 'Grain, warmth and memory.', image: image('photo-1519682337058-a94d519337bc', 600) },
];

const findStyle = (id?: string) => STYLES.find((s) => s.id === id);

export const findStyleDef = (id?: string) => findStyle(id);

/** All posts (across revealed/unrevealed models) tagged with the given style. */
export const postsByStyle = (styleId: string): { model: ModelProfile; post: SocialPost }[] => {
  const out: { model: ModelProfile; post: SocialPost }[] = [];
  for (const model of MODEL_PROFILES) {
    for (const post of model.posts) {
      if (post.styleIds?.includes(styleId)) out.push({ model, post });
    }
  }
  return out;
};

export type ShopItem = {
  id: string;
  name: string;
  tag: 'Starter' | 'Common' | 'Rare' | 'Epic';
  /** Mining rate bonus for rigs (shown in the card). */
  rate?: string;
  /** RM cost; 0 means already owned / free starter. */
  cost: number;
  accent: string;
};

/** Miner rigs available in the Market (left category card / miners page). */
export const MINERS: ShopItem[] = [
  { id: 'rig-mk1', name: 'Signal Drill', tag: 'Starter', rate: '+0.004 RM/min', cost: 0, accent: '#8be6d2' },
  { id: 'rig-mk2', name: 'Pulse Forge', tag: 'Common', rate: '+0.012 RM/min', cost: 120, accent: '#c4a7ff' },
  { id: 'rig-mk3', name: 'Aurora Core', tag: 'Rare', rate: '+0.030 RM/min', cost: 480, accent: '#ffbd7d' },
  { id: 'rig-mk4', name: 'Nova Engine', tag: 'Epic', rate: '+0.072 RM/min', cost: 1500, accent: '#ff8d6b' },
];

/** Skin miners available in the Market (right category card / skins page). */
export const SKINS: ShopItem[] = [
  { id: 'skin-aurora', name: 'Aurora', tag: 'Common', cost: 60, accent: '#8be6d2' },
  { id: 'skin-ember', name: 'Ember', tag: 'Common', cost: 60, accent: '#ffbd7d' },
  { id: 'skin-nebula', name: 'Nebula', tag: 'Rare', cost: 240, accent: '#c4a7ff' },
  { id: 'skin-solar', name: 'Solar Flare', tag: 'Epic', cost: 900, accent: '#ff8d6b' },
];

export const findModel = (id?: string) => MODEL_PROFILES.find((model) => model.id === id);

/** Approximate minutes-ago parsed from a "posted" label, for recency sorting. */
export const postedMinutes = (post: SocialPost): number => {
  const raw = post.posted.toLowerCase();
  const num = parseFloat(raw) || 0;
  if (raw.startsWith('yesterday')) return 60 * 24;
  if (raw.includes('w ago')) return num * 60 * 24 * 7;
  if (raw.includes('d ago')) return num * 60 * 24;
  if (raw.includes('h ago')) return num * 60;
  if (raw.includes('m ago')) return num;
  return 60 * 24 * 30;
};

/** Deterministic synthetic view count, stable per post, for "most viewed" sorting. */
export const postViews = (post: SocialPost): number => {
  let h = 0;
  for (let i = 0; i < post.id.length; i += 1) h = (h * 31 + post.id.charCodeAt(i)) % 100000;
  return post.likes * 41 + h + 2500;
};

export const formatFollowers = (count: number) => {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return count.toLocaleString();
};

/**
 * Minutes since the most recent post tagged with a style (smaller = newer).
 * Used to float "just updated" styles to the front of the story row.
 */
export const styleLastUpdated = (styleId: string): number => {
  let min = Number.MAX_SAFE_INTEGER;
  for (const model of MODEL_PROFILES) {
    for (const post of model.posts) {
      if (post.styleIds?.includes(styleId)) min = Math.min(min, postedMinutes(post));
    }
  }
  return min;
};

/** Minutes since a model's most recent post (smaller = newer). */
export const modelLastUpdated = (model: ModelProfile): number => {
  let min = Number.MAX_SAFE_INTEGER;
  for (const post of model.posts) min = Math.min(min, postedMinutes(post));
  return min;
};

/** Styles ordered newest-first (left = most recently posted), capped at `limit`. */
export const recentStyles = (limit = 10) =>
  [...STYLES].sort((a, b) => styleLastUpdated(a.id) - styleLastUpdated(b.id)).slice(0, limit);

export const formatRm = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });