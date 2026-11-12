# Tech Stack — Junior Astronaut Mission Trainer (HD-2D Edition)

Companion to `PRD.md` and `DESIGN_DOC.md`.

**Stack decisions (final):**
- **Database:** Supabase (Postgres), not MongoDB Atlas
- **Deployment:** Vercel, not Netlify
- **Language:** React with plain **JavaScript**, not TypeScript
- **Web app** (not Unity); **React Three Fiber first**, Blender models imported later

---

## 1. Stack overview

| Layer | Choice | Notes |
|---|---|---|
| Build tool | Vite | Fast dev server, simple config |
| UI framework | React 18 (JavaScript, `.jsx`) | No TypeScript |
| 3D | three, @react-three/fiber, @react-three/drei | Diorama, sprites, GLB loading |
| Post-FX | @react-three/postprocessing | Bloom, tilt-shift, vignette |
| State | Zustand | Bridge between engine and UI |
| Animation (UI) | Framer Motion (optional) | Alerts, countdown |
| Styling | CSS Modules or Tailwind | Team choice; pick one Day 1 |
| Audio | Howler.js | SFX and music |
| Database | Supabase (Postgres + Row Level Security) | Event cache, run stats |
| Serverless API | Vercel Functions (`/api`) | DONKI proxy, Supabase writes |
| Hosting / CI | Vercel (Git-connected) | Preview deploys per branch |
| Testing | Vitest | Engine unit tests |
| Linting | ESLint + Prettier | Consistent style |
| 3D assets | Blender → Draco-compressed `.glb` | |
| Sprites | PNG atlases + JSON | Nearest-neighbour filtering |

## 2. Architecture

### Layered design

```
┌────────────────────────────────────────────────────┐
│ UI layer (React DOM)                               │
│ HUD · Screens · Alert modal · Debrief · Settings   │
└───────────────▲────────────────────────────────────┘
                │ reads / dispatches
┌───────────────┴────────────────────────────────────┐
│ State layer (Zustand store)                        │
│ gameState · uiState · settings                     │
└───────▲───────────────────────────▲────────────────┘
        │ calls                      │ subscribes
┌───────┴───────────┐        ┌───────┴───────────────┐
│ Engine (pure JS)  │        │ Scene layer (R3F)     │
│ tick(), events,   │        │ Diorama, sprites,     │
│ seeded RNG, rules │        │ lighting, post-FX     │
└───────▲───────────┘        └───────────────────────┘
        │ events in
┌───────┴────────────────────────────────────────────┐
│ Data layer                                         │
│ DONKI client → mapper → local snapshots            │
│ Supabase cache and run stats via /api routes       │
└────────────────────────────────────────────────────┘
```

**Key rules**
1. The **engine never imports UI or scene code.** It is pure JavaScript: `(state, action, rng) → newState`.
2. UI and scene read from the Zustand store and never mutate state directly.
3. Dev 1 and Dev 2 work independently through the store contract.
4. The game must run with **no network at all** (local snapshots).
5. Swapping the 3D scene for the 2D parallax fallback only replaces the `Scene` component.

### Data flow (one Sol)
1. Player toggles controls → store updates `playerChoices`.
2. Player presses **Next Sol** → `store.advanceSol()` calls `engine.tick(state, choices, rng)`.
3. Engine returns the new state plus an `events[]` log and `cause[]` chain entries.
4. Scene reacts (lighting, sprites, particles); HUD updates gauges; alerts appear.
5. On win or fail, `debrief.build(state.causeLog)` produces the Debrief cards; the run is optionally POSTed to `/api/runs`.

## 3. Project structure

```
junior-astronaut/
├─ public/
│  ├─ models/            # .glb (Draco)
│  ├─ sprites/           # atlases + json
│  ├─ audio/
│  └─ snapshots/         # DONKI snapshot JSON (offline fallback)
├─ api/                  # Vercel serverless functions
│  ├─ donki.js           # proxy + cache
│  └─ runs.js            # save / read anonymous runs
├─ src/
│  ├─ engine/
│  │  ├─ balance.js
│  │  ├─ tick.js
│  │  ├─ events.js
│  │  ├─ rng.js          # seeded RNG
│  │  ├─ levels.js
│  │  ├─ debrief.js
│  │  └─ __tests__/
│  ├─ data/
│  │  ├─ donkiClient.js
│  │  ├─ donkiMapper.js
│  │  └─ supabaseClient.js
│  ├─ store/
│  │  └─ useGameStore.js
│  ├─ scene/
│  │  ├─ Diorama.jsx
│  │  ├─ SpriteActor.jsx
│  │  ├─ Lighting.jsx
│  │  ├─ PostFX.jsx
│  │  ├─ Particles.jsx
│  │  └─ Parallax2D.jsx  # fallback
│  ├─ ui/
│  │  ├─ screens/        # Title, Briefing, Tutorial, Debrief, Settings
│  │  ├─ hud/            # Gauges, Controls, Forecast, CrewPanel
│  │  └─ modals/         # AlertModal, Sol214Card
│  ├─ audio/
│  ├─ App.jsx
│  └─ main.jsx
├─ scripts/
│  └─ simulate.js        # console balance simulator
├─ CREDITS.md
├─ README.md
├─ vite.config.js
└─ package.json
```

Because the project uses plain JavaScript, use **JSDoc comments** for shape documentation and `PropTypes` (optional) for component props. The store shape is documented once in `src/store/useGameStore.js`.

## 4. Engine design (`src/engine`)

### State shape (JSDoc)
```js
/**
 * @typedef {Object} GameState
 * @property {number} sol
 * @property {number} level
 * @property {number} seed
 * @property {{power:number, oxygen:number, shield:number}} gauges
 * @property {Array<{id:string, name:string, role:string, health:number, mood:string}>} crew
 * @property {{panelsOut:boolean, shieldOn:boolean, oxygenLevel:'low'|'normal'|'high'}} choices
 * @property {Array<Object>} timeline      // scheduled events (scripted + NASA-derived)
 * @property {Array<Object>} causeLog      // for Debrief
 * @property {'playing'|'won'|'lost'} status
 */
```

### `tick(state, choices, rng)`
1. Apply generation (solar if panels out and day, scaled by dust).
2. Apply consumption (base, shield, oxygen level).
3. Resolve scheduled events for this Sol (flare, dust, night, comms).
4. Update oxygen and crew health.
5. Append `causeLog` entries (e.g., `{cause:'flare', effect:'shield -25', mitigatedBy:'shield'}`).
6. Check win/lose.
7. Return the new state (pure; no mutation).

### Other engine modules
| Module | Responsibility |
|---|---|
| `balance.js` | All tunable numbers in one file |
| `rng.js` | Seeded RNG (e.g., mulberry32) for replayable runs |
| `events.js` | Event definitions and timeline builder |
| `levels.js` | Level configs (Sols, mechanics enabled) |
| `debrief.js` | Converts `causeLog` into cards plus tips |
| `scripts/simulate.js` | Runs thousands of seeded games with scripted strategies to check win rates |

## 5. Scene design (`src/scene`) — HD-2D in React Three Fiber

| Component | Responsibility |
|---|---|
| `Diorama.jsx` | Terrain, base models (by node name), Earth, stars |
| `SpriteActor.jsx` | Billboarded pixel sprite plane, nearest-neighbour texture, frame animation |
| `Lighting.jsx` | Sun, ambient, window and beacon point lights; driven by game state |
| `PostFX.jsx` | Bloom, tilt-shift, vignette; quality preset aware |
| `Particles.jsx` | Dust and flare particles |
| `Parallax2D.jsx` | 2D fallback scene |

### HD-2D recipe
- Sprites: `THREE.NearestFilter` on textures, `alphaTest` for crisp edges, billboard toward camera.
- Camera: fixed perspective with slight tilt; orthographic-feeling framing.
- Post-FX: `Bloom` (emissive windows, beacon), tilt-shift via blur band, light vignette.
- Quality presets: **High** (all FX), **Medium** (bloom only), **Low** (no post-FX, fewer particles). Auto-downgrade if fps drops.
- Models: `useGLTF` with Draco decoder; placeholder boxes named identically until `.glb` arrives.

> The exact prop names of `@react-three/postprocessing` effects should be confirmed against current docs when installing.

## 6. State management (Zustand)

`useGameStore` exposes:

| Slice | Contents |
|---|---|
| `game` | `GameState` above |
| `actions` | `startLevel`, `setChoice`, `advanceSol`, `resolveSol214`, `restart` |
| `ui` | current screen, active alert, tutorial step |
| `settings` | volume, reducedMotion, quality, colourBlind |
| `data` | event source (`live` / `snapshot`), loading flags |

Scene and UI subscribe with selectors to avoid re-render storms.

## 7. External API: NASA DONKI

**Base:** `https://api.nasa.gov/DONKI/` (requires free API key from `api.nasa.gov`).

| Endpoint | Use |
|---|---|
| `/FLR` | Solar flares (class, begin / peak / end time, region) |
| `/CME` | Coronal mass ejections (speed, type) |
| `/GST` | Geomagnetic storms (optional) |

### Flow
```
Browser → /api/donki?start=&end=  →  Vercel Function
                                      ├─ check Supabase `donki_cache` (fresh?)
                                      ├─ else fetch NASA DONKI with server-side key
                                      ├─ normalize + store in Supabase
                                      └─ return normalized events
If any step fails → client loads /public/snapshots/*.json
```

### Mapper (`donkiMapper.js`)
- Converts raw DONKI records into game events: `{ id, type, severity, solOffset, leadTime, factText, source:'NASA DONKI', date }`.
- Compresses real timestamps onto the Sol timeline.
- Clamps and caps events so levels remain winnable.

### Reliability rules
1. Bundle **3–5 curated snapshot periods** (chosen by the Research member).
2. Client uses a short timeout (about 3 s) and falls back to snapshots.
3. Cache responses in Supabase and via HTTP cache headers.
4. Never expose the NASA key to the browser.

> **Not yet verified:** NASA API rate limits and exact DONKI field names. Check live docs on Day 1 and update `donkiMapper.js` accordingly.

## 8. Database: Supabase

Supabase replaces MongoDB Atlas. It is used only for **non-critical** features, so the game works without it.

### Tables

```sql
-- Cached, normalized NASA events
create table donki_cache (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,            -- 'FLR' | 'CME' | 'GST'
  event_key text not null unique,      -- NASA id or composite key
  start_time timestamptz,
  payload jsonb not null,              -- normalized event
  fetched_at timestamptz default now()
);

-- Anonymous run results
create table runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  level int not null,
  seed bigint not null,
  event_source text not null,          -- 'live' | 'snapshot'
  outcome text not null,               -- 'won' | 'lost'
  sols_survived int not null,
  primary_cause text,                  -- top cause from debrief
  client_id uuid                       -- random anonymous id from localStorage
);
```

### Security (Row Level Security)
```sql
alter table donki_cache enable row level security;
alter table runs enable row level security;

-- Public read of cache; writes only via service role (Vercel function)
create policy "read cache" on donki_cache for select using (true);

-- Anonymous inserts allowed with validation; reads limited to aggregated views
create policy "insert runs" on runs for insert with check (
  level between 1 and 3 and sols_survived >= 0
);
```

- Browser uses the **anon key** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Vercel functions use the **service role key** (never exposed to the client).
- Optional view `run_stats` for aggregated "most common cause of failure" (nice for demo).

### Client usage
```js
// src/data/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```
All calls are wrapped in try/catch; failure is silent to the player.

## 9. Backend routes (Vercel Functions, JavaScript)

| Route | Method | Purpose |
|---|---|---|
| `/api/donki` | GET | Proxy and cache NASA DONKI; returns normalized events |
| `/api/runs` | POST | Validate and store anonymous run result in Supabase |
| `/api/runs` | GET | (optional) Aggregated stats |

Example shape:
```js
// api/donki.js
export default async function handler(req, res) {
  try {
    const { start, end } = req.query;
    // 1) check Supabase cache  2) fetch NASA with process.env.NASA_API_KEY
    // 3) normalize and upsert   4) respond
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ source: 'live', events: [] });
  } catch (e) {
    res.status(502).json({ source: 'error', events: [] });
  }
}
```

## 10. Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NASA_API_KEY` | Vercel (server only) | DONKI access |
| `SUPABASE_URL` | Vercel (server only) | Server-side Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server only) | Privileged writes |
| `VITE_SUPABASE_URL` | Client | Public Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Public anon key (RLS-protected) |

Keep a `.env.example` in the repo; never commit real keys.

## 11. Deployment (Vercel)

1. Import the Git repo into Vercel on Mon 9 Nov (Dev 3).
2. Framework preset: **Vite**; build command `vite build`; output `dist`.
3. Add environment variables (Production and Preview).
4. `api/` folder is deployed automatically as Vercel Functions.
5. Every pull request gets a preview URL for playtesting.
6. Production deploy rehearsal on Fri 13 Nov; final deploy before Sun 15 Nov submission.
7. Add a rewrite for SPA routing if needed in `vercel.json`.

## 12. Performance budget

| Item | Budget |
|---|---|
| Total models | Under 10 MB (Draco) |
| Sprite atlases | Under 3 MB |
| Audio | Under 8 MB (compressed, lazy-loaded) |
| First load JS | Under 1.5 MB gzipped (code-split Scene and screens) |
| Draw calls | Under 150 on High preset |
| Target fps | 60 desktop / 30 tablet |

Techniques: Draco compression, texture atlases, instancing for craters and rocks, lazy-loaded levels, capped DPR (`dpr={[1, 1.5]}`), quality auto-downgrade.

## 13. Testing and quality

| Type | Tool | Owner |
|---|---|---|
| Engine unit tests (tick, events, RNG determinism, debrief) | Vitest | Dev 1 |
| Balance simulation (win-rate targets) | `scripts/simulate.js` | Dev 1 |
| Component checks, keyboard and a11y pass | Manual + browser dev tools | Dev 2 |
| FPS and memory profiling | Browser performance tools, `r3f-perf` | Dev 3 |
| Offline test (disable network) | Manual | Dev 3 |
| Kid playtests | Observation sheet | Research |

## 14. Team ownership map

| Member | Stack areas |
|---|---|
| Dev 1 | `src/engine`, tests, `scripts/simulate.js` |
| Dev 2 | `src/ui`, `src/store` (with Dev 1), accessibility, audio hooks |
| Dev 3 | `src/scene`, `src/data`, `api/`, Supabase, Vercel, performance |
| Blender member | `public/models/*.glb` |
| Design member | `public/sprites`, UI skin, fonts, audio sourcing, `CREDITS.md` |
| Research member | `public/snapshots`, content strings, README, demo script |

## 15. Build order (mapped to schedule)

| Day | Technical milestone |
|---|---|
| Mon 9 | Vite + React JS repo, Vercel project, Supabase project and tables, placeholder scene |
| Tue 10 | Engine v0 with tests, gauges and controls, store contract, placeholder diorama, snapshots in `public/snapshots` |
| Wed 11 | **First playable** (engine + HUD + placeholder scene); first `.glb` import |
| Thu 12 | Live DONKI via `/api/donki`, post-FX, lighting by state; **assets frozen**; HD-2D vs 2D fallback decision |
| Fri 13 | Audio, tutorial, Debrief polish, Supabase run logging, production deploy |
| Sat 14 | Playtest, bug fixes, performance pass, demo video |
| Sun 15 | Final regression check, submit |

## 16. Risks (technical)

| Risk | Mitigation |
|---|---|
| Post-FX too heavy | Quality presets and auto-downgrade; 2D fallback |
| NASA API issues | Snapshots plus Supabase cache plus short timeout |
| Supabase issue or misconfigured RLS | Game never depends on it; test inserts early |
| Lack of types causes bugs | JSDoc shapes, PropTypes, unit tests, store contract doc |
| Model node names mismatch | Naming rule in Design Doc; placeholder names match |
| Vercel function cold starts | Cache headers; snapshot fallback on client |

## 17. Starter commands

```bash
npm create vite@latest junior-astronaut -- --template react
cd junior-astronaut
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing zustand howler @supabase/supabase-js framer-motion
npm i -D vitest eslint prettier
```

Note: choose the plain `react` (JavaScript) template, **not** `react-ts`.
