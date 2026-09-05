# RM Coin — Product & Engineering README

RM Coin is a **mobile-first social + mining Telegram Mini App** (tested in a bare browser, no Telegram needed).
Users run a virtual miner that yields **RM Coin** (primary, mined) and **LP** (Leverage Points, earned via ads),
browse a fashion/influencer-style social feed of models and styles, unlock models behind a "curtain" reveal ritual,
and spend currency in a **Market** with a prize wheel.

This README is the authoritative handoff doc: every feature built so far, the exact data/logic behind it, hard constraints,
and a clear **"what works / what is stubbed / what is NOT built"** section so the next agent (or ChatGPT) can continue cleanly.

---

## 1. Stack & environment

- **Framework:** Vite 7 + React 18 + TypeScript (strict).
- **Styling:** Tailwind CSS with a custom dark "phone" theme (`index.css`). Phone-locked layout: a fixed-width column, never a desktop-responsive grid.
- **Routing:** `wouter` (hash-less). Bottom tab bar is the only nav surface.
- **State:** React Context-free; a single `useSocialState` hook persisted to `localStorage` (`rm-coin-social-prototype-v2`).
- **API:** TanStack React Query + an auto-generated `@workspace/api-client-react` (OpenAPI). Server-backed miner/balance/activity + an **offline fallback** so the app runs with no backend.
- **Node / tooling:** Node v22.18.0, pnpm 9.15.9. Monorepo root at `RM/`, app at `RM/artifacts/rm-coin`.
- **Ad SDK:** Monetag (optional, via `VITE_MONETAG_ZONE_ID`). When unset, a **demo ad fallback** simulates the rewarded ad.

### Run locally + expose via ngrok (current live state)
```bash
cd RM/artifacts/rm-coin
pnpm install
pnpm run dev                 # Vite on http://localhost:3000

# in a second terminal:
ngrok http 3000              # creates a public https URL (Free plan rotates on every restart)
```
- **Live URL (this session):** `https://81a0-66-234-147-240.ngrok-free.app`  → forwards to `localhost:3000`.
- Free-plan ngrok URLs rotate each time the agent restarts, so always re-derive: `curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[a-z0-9-]*\.ngrok-free\.app'`.
- **Verify before claiming done:** `npx tsc --noEmit` and `npx vite build` must both exit 0. (The app also serves `/market`, `/market/miners`, `/market/skins` → 200.)

> NOTE on external media: this sandbox blocks hotlinking to Google / Unsplash / w3schools sample buckets (HTTP 403). All model/style cover images therefore use `images.unsplash.com` URLs directly in code (they happen to load from the browser), but **never** rely on external sample video URLs — see Mara's video below.

---

## 2. Navigation (bottom tabs, in order)

| Tab | Route | Screen |
|-----|-------|--------|
| Home | `/` | RM Coin overview + activity log |
| Mine | `/miner` | Miner visual, claim RM, watch-ad energy |
| **Market** | `/market` | Categories + prize wheel (replaced the old "Level" tab) |
| Models | `/explore` | Model directory (grid of all models, reveal/unreveal states) |
| Explore | `/explore/feed` | Social feed: story rows + post grid |
| Me | `/me` | Profile |

Secondary routes: `/styles`, `/styles/:id`, `/model/:id`, `/reveal/:id`, `/market/miners`, `/market/skins`.

---

## 3. Social feed (`/explore/feed`)

- **Two horizontal "story" rows** at the top, Instagram-style, drag-scrollable (mouse on desktop, touch on mobile):
  - **Revealed models row** — every *unlocked* model, **newest-post-first** (a model that just posted a shot jumps to the left). Ends with a gradient **"reveal more"** square button (orange→pink) linking to `/explore`.
  - **Styles row** — **10 most-recently-posted styles, newest first** (a style gets "updated" when a post tags it, then floats left). Ends with a gradient **"all styles"** square button (green→purple) linking to `/styles`.
- **Filter bar:** All / Images / Videos. **Sort:** Latest / Oldest / Hottest / Views.
  - *Oldest* = oldest-first by post time (the legacy "Newest" was a duplicate of Latest; renamed).
- **Post grid:** deduplicated feed of all revealed models' posts. Tap a post → **Post Viewer** (full-screen).
- **Post Viewer** features:
  - Mute/unmute global toggle (rail button, `Volume2`/`VolumeX`) applied to **all** `<video>` posts via `state.muted`.
  - **View counter** (Eye icon) with `(viewCounts[id]||0)+1`.
  - **Save** (bookmark) and **Like** (heart → "Hot") toggles.
  - Video posts render a real `<video autoPlay loop playsInline muted={state.muted}>`; the click-to-open autoplay-with-sound works because opening is a user gesture.
  - Clicked post `scrollIntoView`s to center.

### Mara Vale sample video (`mara-04`) — and the audio/sound verification standard
- External sample MP4s (Google `gtv-videos-bucket`, w3schools) return **403** from this region. Fix: a local `public/mara-soundcheck.mp4` was synthesized with `ffmpeg` (12s, audible 440 Hz tone, yuv420p + aac). The post points at `/mara-soundcheck.mp4` (same-origin → no CORS, plays offline). Used to verify the mute/unmute toggle.
- **This is the canonical "does sound work?" test asset for the next level.** Any new video feature must follow the same rule: **never hotlink external video** (403 here); drop the file in `public/` and reference it by same-origin path. When verifying audio/mute in the next session, open Mara Vale's `mara-04` post in the Post Viewer and toggle the global mute rail button — you should hear the tone, then silence, then tone. If a future video is silent or fails to load, suspect an external-URL 403 first.

---

## 4. Models (`MODEL_PROFILES`) & reveal

- 8 models (`Mara Vale`, `Noor Kai`, `Ivy Sato`, `Celeste Rowan`, `Sora Milan`, `Juno Ardent`, `Rhea Sol`, `Elara West`). Each has `posts[]`, `revealCostLp`, `rmCost`, `avatar`, `cover`, `accent`.
- **Reveal ritual** (`/reveal/:id`): a 5-panel "curtain" lifted bottom-up via `clip-path` bands over the real sharp cover. Spend LP per tap (`revealLpPerTap = ceil(revealCostLp/5)`). After 5 taps the model is added to `unlockedIds`.
- **Instant unlock** with RM Coin (`unlockWithRm`) — primary coin only.
- **`/explore`** shows all models; locked ones use the overlay + reveal CTA; unlocked show full profile link.
- **Revealed models story row** (explore/feed) is sorted newest-post-first (section 3).

## 5. Styles (`STYLES`) & style pages

- 8 style definitions (`tattoo`, `streetwear`, `studio`, `editorial`, `night`, `beach`, `minimal`, `vintage`).
- **`/styles`**: top story row shows **10 newest-posted styles first**; below, a random-10 grid (re-rolls each mount).
- **`/styles/:id`**: posts filtered by that style; **unrevealed models' posts are blurred** with an "Unrevealed shot" label + "Reveal model" button → `/reveal/{model.id}`. Revealed models' posts show normally. Follow button uses `followedStyles`.
- `postsByStyle(styleId)` aggregates posts across all models that tag the style.

---

## 6. Market (`/market`) — rebuilt per latest request

### 6a. Inventory strip (top of Market)
Live counts from `useSocialState`: **Model Tickets**, **Shot Tickets**, **Mine +minutes**, **RM** (local wallet, fed by wheel wins).

### 6b. Two category entry buttons (replaced the inline side-by-side list)
Two **square, tappable** cards with an icon + title:
- **Miners** → `/market/miners`
- **Skins** → `/market/skins`

### 6c. Category pages (`/market/miners`, `/market/skins`)
Each is its own page with a **2-column grid** of product cards (icon, name, tag, rate for rigs, cost, Buy button).
- Data lives in `social-data.ts` as `MINERS` (4 rigs: Signal Drill starter → Nova Engine epic) and `SKINS` (4 skins).
- Buy buttons are **UI-only** (disabled if balance < cost); no purchase logic wired yet (RM is tracked but spend-on-buy is a TODO).

### 6d. Prize wheel
- 8 slices, spun with a CSS `conic-gradient` + rotation transition. Slices:
  - **RM:** `0.2 RM`, `0.5 RM` (lowered from the earlier 50/120)
  - **LP:** `5 LP`, `12 LP` (lowered from 15/30)
  - **Model Ticket** ×1, **Shot Ticket** ×1
  - **Mine time:** `+5m`, `+15m`
- **Ticket slices use the orange-pastel brand color** (`#e9a06a`); coin slices are dark. The won-prize banner + the "Watch ad" button use the brand `grad-accent` (orange→pink) class.
- **Spin gating (new):**
  - **1 free spin per 24h** — tracked by `lastWheelSpin` epoch; refreshes after `DAY_MS`.
  - **Earned spins from ads** — `earnedSpins` + `adsWatchedForSpin`; every **10 watched ads = 1 spin**.
  - Wheel is disabled unless a free spin is ready **or** `earnedSpins > 0`.
  - On win: `grantReward(...)` credits RM→`rmBalance`, LP→`lpBalance`, tickets, mine minutes; then consumes the used spin (`useDailySpin()` or `consumeEarnedSpin()`).
- **Watch-ad button** below the wheel (`button-watch-ad`): demo handler `recordAdSpin()` increments the ad counter (10→1 earned spin). When `VITE_MONETAG_ZONE_ID` is set, swap this for the real Monetag rewarded-ad flow and call `recordAdSpin()` on completion.

### 6e. State fields backing the Market (in `useSocialState`)
`modelTickets`, `shotTickets`, `bonusMineMinutes`, `rmBalance`, `lastWheelSpin`, `earnedSpins`, `adsWatchedForSpin`.
Actions: `grantReward`, `useDailySpin`, `recordAdSpin`, `consumeEarnedSpin`.
All persisted to `localStorage`.

### 6f. Ticket system — full lifecycle, where tickets come from, and exactly where they will be spent (READ THIS FIRST)

This is the most important section for the next agent. Tickets are a **first-class reward currency** in the app, but only the *earning* half exists today. Below is the complete mental model, the code that backs it, and the precise plan for the *spending* half.

#### 6f.1 What a "ticket" is (game-design intent)
- Tickets are **alternate unlock currencies** that let a player bypass the normal cost of revealing content.
- They are deliberately **rarer than RM/LP** because they come only from the prize wheel (you cannot buy them), making them feel like a win.
- Two kinds, non-interchangeable:
  - **Model Ticket** → unlocks a *whole model profile* for free (replaces the LP curtain taps **or** the RM instant-unlock cost).
  - **Shot Ticket** → unlocks a *single gated shot* (one image/video post) on a model that is *already revealed* (the model is open, but one specific post inside is still locked).

#### 6f.2 Source — where tickets are earned (WORKING ✅)
- **Only** the prize wheel (§6d) can grant tickets.
- Wheel slices: one `Model Ticket` slice, one `Shot Ticket` slice (each awards ×1).
- On a win, `MarketPage.roll()` calls `grantReward({ modelTickets: 1 })` or `{ shotTickets: 1 }`.
- `grantReward` (in `use-social-state.ts`) does:
  ```ts
  modelTickets: current.modelTickets + (reward.modelTickets || 0),
  shotTickets: current.shotTickets + (reward.shotTickets || 0),
  ```
- There is **no other source** (not from ads, not from buying, not from mining). If the next agent adds a source, document it here.

#### 6f.3 Storage (WORKING ✅)
- Both counters live in the single `SocialState` object in `src/hooks/use-social-state.ts`:
  - `modelTickets: number` — default `0`.
  - `shotTickets: number` — default `0`.
- Persisted to `localStorage` key `rm-coin-social-prototype-v2` (survives refresh / reload).
- `readState()` validates them as numbers on load (`typeof parsed.modelTickets === 'number' ? … : 0`).
- **No cap** is enforced — they can accumulate indefinitely (a deliberate choice; revisit if abuse is a concern).

#### 6f.4 Display (WORKING ✅)
- Shown live in the **Market inventory strip** at the top of `/market` (§6a): two `InvChip` chips labelled **Model** and **Shot**, each rendering `state.modelTickets` / `state.shotTickets`.
- Updated instantly after a wheel win (React state → re-render).
- The wheel slices themselves render in the **orange-pastel brand color `#e9a06a`** (vs. dark coin slices) so they read as "special" and the player learns tickets are premium.

#### 6f.5 Sink — where tickets will be SPENT (NOT BUILT ❌ — this is the planned next step)
Neither ticket can be consumed yet. The intended consumption UX:

**Model Ticket → reveal a model (bypass LP/RM)**
- **Location:** the model's reveal screen `/reveal/:id` (and optionally the `/explore` directory card for a still-locked model).
- **Trigger:** when `state.modelTickets > 0` and the model is **not** yet in `unlockedIds`, show a **"Use Model Ticket"** button next to the LP taps / RM unlock.
- **Effect on tap:**
  1. Decrement `modelTickets` by 1.
  2. Add the model id to `unlockedIds` (full instant reveal — same end-state as finishing the 5 curtain taps or paying `rmCost`).
  3. Navigate into the now-revealed profile.
- **New action to add** in `useSocialState`, e.g.:
  ```ts
  const useModelTicket = useCallback((modelId: string) => {
    setState((c) => (c.modelTickets <= 0 || c.unlockedIds.includes(modelId))
      ? c
      : { ...c, modelTickets: c.modelTickets - 1, unlockedIds: [...c.unlockedIds, modelId] });
  }, []);
  ```
- **Guardrails:** no-op if `modelTickets === 0` or already unlocked; never go negative.

**Shot Ticket → unlock one gated shot on a revealed model (bypass per-post lock)**
- **Location:** an **already-revealed** model's profile `/model/:id`.
- **Data model change needed:** posts currently have no `unlocked` flag. Add `locked?: boolean` (or track locked post ids in `SocialState` as `unlockedShotIds: Record<modelId, string[]>`). Seed some posts as locked so the ticket has something to do.
- **Trigger:** for each locked post on a revealed profile, when `state.shotTickets > 0`, show an **"Unlock with Shot Ticket"** affordance over that post.
- **Effect on tap:**
  1. Decrement `shotTickets` by 1.
  2. Flip that post's `locked` flag → `unlocked` (or push its id into `unlockedShotIds[modelId]`).
  3. The post renders normally (image/video, no blur/lock).
- **New action to add**, e.g.:
  ```ts
  const useShotTicket = useCallback((modelId: string, postId: string) => {
    setState((c) => (c.shotTickets <= 0)
      ? c
      : { ...c, shotTickets: c.shotTickets - 1,
          unlockedShotIds: { ...c.unlockedShotIds, [modelId]: [...(c.unlockedShotIds[modelId] || []), postId] } });
  }, []);
  ```
- **User instruction preserved:** the user explicitly said *"we will apply it later"* for Shot Tickets — do **not** block other work on it, but the consumption path above is the agreed design.

#### 6f.6 Why this matters / how to verify in the next level
- **Today you can test earning:** spin the wheel until you land on a ticket slice (or watch 10 ads to farm spins), confirm the Market inventory count goes up, and confirm it persists across reload.
- **You cannot yet test spending** — that is the gap to close.
- **Regression risk:** any change to `grantReward`, `modelTickets`, `shotTickets`, or `localStorage` schema must keep the counters intact; bump the storage key (`rm-coin-social-prototype-v2`) if you change the shape, or old persisted state will silently reset tickets to 0.
- **Do not** let tickets be spent without decrementing, and do not let RM/LP reveal logic and ticket reveal logic conflict (a model revealed by ticket should behave identically to one revealed by LP/RM afterward).

> One-line mental model: **tickets are a wheel-only reward held in `modelTickets`/`shotTickets`; Model Ticket = free whole-model unlock, Shot Ticket = free single-shot unlock on a revealed profile. Earn side ✅, spend side ❌ (plan above).**

---

## 7. Global UX rules

- **Phone-locked layout:** single fixed-width column on every device. No desktop-responsive breakpoints for the social shell.
- **Scroll feel:** scrollbars hidden everywhere (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`). **Drag-to-scroll** enabled:
  - Element-level (`useDragScroll`) on the horizontal story rows (Instagram-style).
  - Window-level (`useWindowDragScroll`) for vertical page scroll on desktop mouse; ignores interactive targets (buttons/links/inputs/video/img) so taps still navigate. Pointer-capture was removed because it swallowed the click on inner `<a>`/`<button>` (that was the earlier "rows not clickable" bug).
- **Mute** is global and persisted.
- **Offline fallback:** when the API/auth 404s, `ENABLE_OFFLINE_FALLBACK` drops into a mock session (`OFFLINE_USER`, `OFFLINE_MINER`, `OFFLINE_ACTIVITY`). Log lines like `POST /api/auth/preview` and `POST /api/ads/reward-intent` returning 404 are **expected** in this mode — not bugs.

---

## 8. What is built (green) vs. stubbed vs. NOT built

### ✅ Built & working (verified by `tsc` + `vite build` + ngrok 200s)
- Miner control, RM claim, watch-ad energy (demo fallback when no Monetag zone).
- Social feed with newest-first model + style story rows, filter/sort, post viewer (mute, view count, save, like).
- Model reveal curtain (LP taps + RM instant unlock); `/explore` directory.
- Styles list (newest-10 row + random-10 grid) and style detail with unrevealed-blur gating.
- Market: 2 category buttons → own pages (2-col grids), prize wheel with lowered prizes, orange-pastel ticket slices, 24h-free + ad-earned spin gating, watch-ad counter.
- Global hidden scrollbars + desktop drag-to-scroll.
- Local Mara video sample (no external dependency).

### 🟡 Stubbed / UI-only (no real logic behind)
- **Buy buttons** on Miners/Skins: present and disabled-state-aware, but no purchase/spend transaction.
- **RM Coin wallet** (`rmBalance`) is credited by the wheel but not yet spendable anywhere.
- **Watch-ad → spin**: demo increment only; real Monetag wiring is a TODO (env-gated).
- **Model Ticket / Shot Ticket**: stored + shown in inventory (source = prize wheel, see §6f). **No consume/redemption flow yet** — they accumulate but cannot be spent.
- **Mine-time bonus** is tracked but not yet applied to the miner's energy timer.

### ❌ NOT built yet (explicitly deferred)
- **Model Ticket redemption** — using a ticket to reveal a model without LP/RM. Plan: a "Use ticket" action on `/reveal/:id` (and `/explore` directory) that calls a new `useSocialState` action decrementing `modelTickets` and adding the model to `unlockedIds` (see §6f).
- **Shot Ticket redemption** — unlocking a specific shot (image/video) on an already-revealed model profile (`/model/:id`). Plan: per-shot "Unlock with ticket" control decrementing `shotTickets` and flipping that post's `unlocked` flag. The user said "we will apply it later."
- **Real backend persistence** of social state — **NOW BUILT (see §12).** Social state (reveals, LP, tickets, wheel, follows, likes, views, mute) is persisted server-side per Telegram user via `GET/PUT /api/social` + the `rm_social_profiles` table, with a localStorage fallback for bare-browser dev. The miner/RM/LP server balance was already authoritative.
- **Telegram Mini App polish** (initData signing is in code but untested without a real bot).
- **Real ad SDK** integration beyond the demo fallback.

---

## 9. Key files (for the next agent)

| File | Responsibility |
|------|----------------|
| `src/lib/social-data.ts` | All mock data: `MODEL_PROFILES`, `STYLES`, `MINERS`, `SKINS`, `ShopItem` type, helpers (`postedMinutes`, `modelLastUpdated`, `styleLastUpdated`, `recentStyles`, `postsByStyle`, `findModel`, `findStyleDef`). |
| `src/hooks/use-social-state.ts` | Single state + actions. **Backend-aware**: hydrates from `GET /api/social` and calls server-authoritative action endpoints when online; localStorage-only when offline; the old direct-balance write-through was removed (anti-pattern). |
| `src/lib/social-api.ts` | Thin fetch client for the server-authoritative social endpoints (GET aggregate + action POSTs). |
| `src/lib/offline.ts` | `ENABLE_OFFLINE_FALLBACK` + mock preview session; `isOfflineMode()` gates backend calls. |
| `src/lib/use-drag-scroll.ts` | `useDragScroll` (element) + `useWindowDragScroll` (vertical). No pointer-capture. |
| `src/pages/explore-feed.tsx` | Social feed: story rows (newest-first), filter/sort, post grid, gradient row buttons. |
| `src/pages/market.tsx` | Market: inventory, 2 category buttons, prize wheel, spin gating, watch-ad. |
| `src/pages/market-miners.tsx` / `market-skins.tsx` | Category product pages (2-col grids). |
| `src/pages/styles.tsx` / `style.tsx` | Styles list (newest-10 + random-10) and style detail with blur gating. |
| `src/pages/reveal.tsx` | 5-panel clip-path curtain reveal. |
| `src/components/post-viewer.tsx` | Full-screen post: mute, view count, save/like, video. |
| `src/App.tsx` | Routes + auth gate + offline fallback. |
| `src/components/social-shell.tsx` | Bottom tab bar (Market replaced Level), drag-scroll mount, status bar. |
| `public/mara-soundcheck.mp4` | Local sample video for mute testing (no external URL). |
| `src/index.css` | Theme, `grad-accent`/`grad-reveal-more`/`grad-all-styles`, scrollbar hide. |

---

## 10. Build / verify commands
```bash
npx tsc --noEmit      # strict typecheck, must be 0
npx vite build        # production bundle, must be 0
pnpm run dev          # Vite dev server on :3000
```

## 12. Backend & Telegram integration (current state)

The repo **already had a real backend** (`artifacts/api-server`: Express 5 + Drizzle/Postgres + pino) plus `@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`, and `@workspace/api-spec` (OpenAPI + orval). The integration work added **server-side persistence for the social/gameplay state**, which previously lived only in `localStorage`.

### 12.1 What already existed (reused, not duplicated)
- **Telegram auth** (`middlewares/auth.ts`): real `initData` HMAC verification (`HMAC_SHA256(bot_token, "WebAppData")`), signed HttpOnly `rm_session` cookie, `requireSession`.
- **`POST /api/auth/telegram`**: validates initData → upserts `rm_users` → sets session → returns `{user, miner}`.
- **`POST /api/auth/preview`**: dev-only browser session (disabled in prod). This is what the offline fallback hits today.
- **`/telegram/webhook`** + `lib/telegram.ts`: `/start` handler → inline "Open RM Coin" `web_app` button; webhook secret verification (HMAC derived from bot token). Requires a real bot + `TELEGRAM_BOT_TOKEN`, and a registered webhook via `node ./scripts/telegram-webhook.mjs set`. The registration script reads `TELEGRAM_WEBHOOK_URL` (or falls back to `TELEGRAM_WEBAPP_URL` when the Vite proxy forwards `/api` to the api-server).
- **Mining/RM/LP/balance** are fully server-authoritative already (`rm_users.balance`, `rm_user_miners`, `rm_transactions`, `rm_ad_rewards`).

### 12.2 What was added (server-authoritative social + identity)
- **User identity** (`rm_users`): extended with the full verified Telegram profile — `telegramUserId` (permanent external key, **never username**), `lastName`, `displayName`, `photoUrl`, `languageCode`, `isPremium`, `lpBalance`, `lastLoginAt`. `validateTelegramInitData()` now extracts all these fields; `/auth/telegram` + `/auth/preview` upsert them and `ensureSocialRows()` creates the per-user social rows on first login.
- **Relational social schema** (`lib/db/src/schema/rm-coin.ts`): `rm_reveals`, `rm_follows`, `rm_post_interactions` (like/save/hot), `rm_post_views`, `rm_followed_styles`, `rm_ownership` (miners/skins), `rm_social_state` (aggregate counters + equipment, one row/user, row-locked), `rm_social_meta` (non-authoritative `muted` only). Migration: `lib/db/migrations/0003_social_identity.sql` (idempotent; **drops the old `rm_social_profiles` jsonb table**).
- **Server-authoritative API** (`artifacts/api-server/src/routes/social.ts`): `GET /api/social` returns an aggregate computed from the relational rows. Every mutation is a **transactional, validated** endpoint — the client sends only *intent* (`modelId`, `postId`, `itemId`, `flag`), never values:
  - `POST /social/reveal/tap` (server spends LP), `POST /social/reveal/unlock` (server validates RM cost), `POST /social/follow`, `POST /social/post` (like/save/hot), `POST /social/view` (atomic increment), `POST /social/follow-style`, `POST /social/mute`, **`POST /social/wheel/spin` (server picks the prize, validates spin availability)**, `POST /social/ads/intent` (advance earned-spin counter), `POST /social/purchase` (server validates item cost), `POST /social/equip`.
  - Costs/prizes live in **one source of truth** (`artifacts/api-server/src/lib/catalog.ts`), mirrored from the client catalogue. The client can never self-credit (`rmBalance=999999`) — balances are computed server-side under row locks.
  - **The old blind `PUT /api/social` (which accepted any client JSON) was removed** — it was the exact anti-pattern the security spec forbids.
- **Frontend client** (`src/lib/social-api.ts`): `fetchSocialProfile()` + `socialApi.*` action calls (raw `fetch`, same-origin cookies). The `useSocialState` hook hydrates the aggregate on mount and calls the server on every action; **offline/bare-browser path is unchanged** (local mutations only).
- **`market.tsx`** wheel now calls `spinWheel()` (server returns the prize + new aggregate); the client only animates — it cannot choose or forge the prize.
- **Vite dev proxy** (`vite.config.ts`): when `API_SERVER_PORT` is set, `/api` is proxied to the api-server (default `http://localhost:5000`). Additive — when the api-server is down, requests 404 and the app falls back to offline mode.

### 12.3 Security guarantees (§6 of the brief)
- Telegram `initData` verified server-side (HMAC) before any session.
- `telegramUserId` is the permanent identity; username is never used as a key and is re-synced on login.
- All balance changes happen server-side; RM/LP can't go negative; mining claims, ad rewards and wheel spins are row-locked transactions (no double-claim under concurrency); purchases/equips are atomic and cost-validated.
- The browser can only send intent, never computed values.

### 12.4 How to run the full stack (deploy / next agent)
1. Provision Postgres; set `DATABASE_URL`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBAPP_URL` (see `.env.example`).
2. Apply schema: `psql "$DATABASE_URL" -f lib/db/migrations/0003_social_identity.sql` (plus base tables — `drizzle-kit push` or the initial migration if fresh).
3. `pnpm --filter @workspace/api-server run dev` (serves on `PORT`, e.g. 5000).
4. `pnpm --filter @workspace/rm-coin run dev` with `API_SERVER_PORT=5000` (proxies `/api`).
5. From Telegram, `/start` → tap "Open RM Coin" → `initData` verified server-side → user registered (Telegram identity upserted) → social state aggregates from DB and every mutation persists transactionally.

### 12.4 Verification status of this integration
- `npx tsc --noEmit` (api-server) + `npx tsc --noEmit` + `npx vite build` (rm-coin) pass.
- The **server runtime path was NOT executed live** in the dev sandbox because it has no Postgres/`DATABASE_URL`. The code is wired to the existing, type-checked backend and will run once `DATABASE_URL` + secrets are supplied. The bare-browser/offline path remains fully functional and was re-verified.

---

## 11. Handoff note for the next session
- The ngrok URL **rotates on restart** (Free plan). Always re-pull it from the local ngrok agent API.
- If Vite reports `Failed to resolve import "@/pages/..."`, it is a **stale dev-server module graph** from an edit cascade, not a missing file — kill the Vite process holding `:3000` and start a fresh `pnpm run dev`.
- Social state persists in `localStorage` key `rm-coin-social-prototype-v2` (client cache); when a real backend session is active it is also persisted server-side in `rm_social_profiles`. Clear localStorage to reset local copy; the server copy re-hydrates on next load (and vice-versa once the backend is the source of truth).
- Next logical work: wire **Model Ticket** + **Shot Ticket** redemption (§6f), make **Buy** buttons spend `rmBalance`, apply **mine-time** bonus to the energy timer, and replace the demo watch-ad with real Monetag. Backend social persistence (§12) is now in place — extend it (e.g. per-field deltas, server-side ticket spend) as those features land.
