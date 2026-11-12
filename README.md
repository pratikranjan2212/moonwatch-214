# MOONWATCH: Sol 214

> **"Keep your crew alive. Real NASA flares. Your call."**

**MOONWATCH: Sol 214** is a kid-friendly (ages 9–14) HD-2D lunar outpost survival and resource-allocation game built with **React 18 (plain JavaScript)**, **React Three Fiber**, **Zustand**, **Supabase**, and **Vercel Functions**, powered by real **NASA CCMC DONKI** space-weather data.

---

## Science-to-Mechanics Mapping Table

| Real Space-Weather / Lunar Concept | Real Scientific Facts (NASA DONKI / Lunar Science) | In-Game Mechanic in *MOONWATCH: Sol 214* |
|---|---|---|
| **Solar Flares (`FLR` — C, M, X Classes)** | Sudden magnetic energy releases on the Sun emitting X-rays and extreme UV at the speed of light (~8 minutes to the Earth-Moon system). GOES classifies them as `A`, `B`, `C`, `M`, or `X` (each letter is $10\times$ stronger). | Scheduled from real NASA DONKI `FLRObject` records (`flrID`, `classType`, `beginTime`, `activeRegionNum`). Minor (`C`), Major (`M`), and Extreme (`X`) flares damage unshielded crew health (`-10` to `-36` HP) and drain/scorch extended solar arrays unless the **Shield Dome** (`-8 Power/Sol`, `80%` mitigation) is activated. |
| **Coronal Mass Ejections (`CME`)** | Billions of tons of magnetized solar plasma hurled into interplanetary space at `400` to `2,500+ km/s`, arriving in `15–72 hours`. | Mapped from DONKI `CMEJSON` and `cmeAnalyses` (`isMostAccurate`, `speed`, SCORE `type`). Faster CMEs (`>1,300 km/s`) have shorter forecast lead times (`1–2 Sols`) and overload unshielded outpost power and shield integrity. |
| **Sol 214 X-Class Super-Flare (Hero Event)** | Based on the May 10, 2024 X3.9 / X5.8 solar superstorm from sunspot region **AR 13664** (the Gannon Superstorm). | **Mission Sol 214 (Level 1, Sol 7)**: Triggers a 10-second live decision modal (`Sol214Card`) — **Retract Panels** (protects the array, `-12 Power`, `-10 Shield`, `0` crew damage) vs. **Leave Panels Out** (geomagnetic surge drains `-38 Power`, `-35 Shield`, and scorches panel efficiency to `45%` for 3 Sols). |
| **Lunar Night Cycle** | The Moon's synodic rotation creates ~14 Earth days of continuous sunlight followed by ~14 Earth days of freezing darkness (`<-130°C`) with zero solar power. | Every 7-Sol cycle includes a 3-Sol **Lunar Night** window (`0` solar generation). Players must charge batteries during daytime Sols to enter Lunar Night with at least `75%` Power. |
| **Electrostatic Lunar Dust (`Regolith`)** | Solar UV radiation photo-charges sharp silicate lunar dust grains, causing them to levitate and cling to solar panels and seals. | **Dust Storms** last 2 Sols, cutting solar output to `30%` and abrading extended solar panels (`-8 Power/Sol`) unless arrays are retracted. |
| **Closed-Loop Bioregenerative Life Support (`Greenhouse`)** | Future lunar habitats use hydroponic plants to scrub crew $\text{CO}_2$ and produce breathable $\text{O}_2$ and fresh food. | **Level 2 (21 Sols)**: Rising cabin $\text{CO}_2$ adds `-5 O₂/Sol` drift. Watering (`-6 Power/Sol`) and tending the **Greenhouse** produces `+9 O₂/Sol` and restores `+4 Crew HP`. |
| **Earth–Moon Comms Delay & Ionospheric Blackout** | Radio signals take ~1.3 seconds one-way, and solar X-ray flares / SEP storms scramble high-frequency transceivers. | **Level 3 (28 Sols)**: Antenna packets have a `2–3 Sol` round-trip latency; queuing telemetry boosts (`-5 Power/Sol`) delivers `+12 Power` and `+6 Shield` when the packet arrives. |

---

## Tech Stack

- **Frontend**: Vite + React 18 (Plain JavaScript `.js`/`.jsx`)
- **HD-2D 3D Scene**: Three.js (`three`), `@react-three/fiber`, `@react-three/drei` (Draco-compressed `.glb` models), `@react-three/postprocessing` (Bloom & Vignette), billboarded nearest-neighbour pixel sprites (`THREE.NearestFilter`), and `Parallax2D` fallback
- **State Management**: Zustand (`src/store/useGameStore.js`)
- **Simulation Engine**: Pure deterministic JavaScript (`src/engine/{balance,rng,levels,events,tick,debrief}.js`) + Monte-Carlo balance simulator (`scripts/simulate.js`)
- **Audio**: Howler.js + Web Audio synthesis fallback (`src/audio/soundManager.js`)
- **Backend & Database**: Vercel Serverless Functions (`api/donki.js`, `api/runs.js`, `api/_security.js`) + Supabase PostgreSQL (`donki_cache`, `runs`, `run_stats` with Row Level Security)

---

## Controls & Accessibility

- **`1` or `P`**: Toggle Solar Panels (`EXTENDED` / `RETRACTED`)
- **`2` or `S`**: Toggle Shield Dome (`ON` / `OFF`)
- **`3` or `O`**: Cycle Oxygen Level (`LOW` / `NORMAL` / `HIGH`)
- **`4` or `G`**: Toggle Greenhouse Watering & Crop Tending *(Level 2+)*
- **`5` or `C`**: Toggle Queue Earth Comms *(Level 3)*
- **`Space` or `Enter`**: Advance to Next Sol
- **`Esc`**: Dismiss active Space-Weather Alert Modal
- **Accessibility**: Colour-blind safe gauge icons/patterns, Reduced Motion mode (disables camera shake and pauses the Sol 214 countdown timer), and `Low` / `Medium` / `High` graphics presets with automatic FPS downgrade.

---

## Local Setup & Scripts

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example to .env.local and add keys
cp .env.example .env.local

# 3. Start local development server
npm run dev

# 4. Run unit & security tests (Vitest)
npm test

# 5. Run 3,000-game Monte-Carlo balance simulator
npm run simulate

# 6. Lint & build production bundle
npm run lint
npm run build
```
