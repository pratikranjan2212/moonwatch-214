# PRD — Junior Astronaut Mission Trainer (HD-2D Edition)

| Field | Value |
|---|---|
| Product | Junior Astronaut Mission Trainer |
| Version | 1.0 (hackathon MVP) |
| Build window | Mon 9 Nov – Sun 15 Nov 2026 (submit Sunday morning) |
| Team | 6 people (3 web devs, 1 Blender artist, 1 design lead, 1 research/content lead) |
| Platform | Browser (desktop first, tablet/mobile responsive) |
| Stack summary | React (JavaScript), React Three Fiber, Zustand, Supabase, Vercel — see `TECH_STACK.md` |
| Related docs | `DESIGN_DOC.md`, `TECH_STACK.md` |

---

## 1. Summary

A browser game where kids play the **Mission Commander of a small lunar outpost**. Each Sol (lunar day) the player allocates limited power, then the game resolves what happens. Hazards (solar flares, dust storms, the long lunar night, communication delay) are driven by **real NASA space-weather data (DONKI)**. After each run, a **Debrief screen** explains the cause chain of what went wrong, and the player replays with different events.

The visual style is **HD-2D** (inspired by *Octopath Traveler II*): pixel-art sprites in a lit low-poly 3D diorama with tilt-shift blur and bloom.

## 2. Problem and opportunity

- Space weather and mission operations are hard to teach with text; kids learn better by making trade-offs and seeing consequences.
- Existing educational space games are either too simple (no real data) or too complex (simulators).
- Opportunity: a short, beautiful, replayable game that turns real NASA data into decisions and teaches *why* outcomes happened.

## 3. Goals and non-goals

### Goals
1. Teach cause and effect in space operations (power, oxygen, shielding, communication delay).
2. Use real NASA DONKI events as the source of in-game hazards, with a safe fallback when offline.
3. Make kids care about the crew through named characters who visibly react.
4. Be playable in 3–8 minutes per run, replayable with varied events.
5. Ship a polished, deployed, judged-ready entry by Sunday 15 Nov.

### Non-goals
- No multiplayer, accounts, or chat.
- No full physics or accurate orbital simulation.
- No native apps, no Unity.
- No user-generated content.

## 4. Target users

| Persona | Description | Needs |
|---|---|---|
| Primary: Young learner (ages 9–14) | Curious about space, plays casual browser games | Clear goals, immediate feedback, low reading load |
| Secondary: Teacher / parent | Wants a classroom-safe science activity | Accurate science notes, short sessions, no sign-up |
| Tertiary: Hackathon judges | Evaluate impact, creativity, science use, polish | Clear story, real-data use, working demo, documentation |

## 5. Product concept

**Setting:** Lunar outpost with a Commander and a crew of 4.
**Core loop (per Sol):**
1. Read the **forecast panel** (upcoming flare, storm, night).
2. Allocate power: toggle panels, shield, oxygen level.
3. Press **Next Sol**; the engine `tick()` resolves resources and events.
4. Crew and base react (visual and audio feedback).
5. Survive all Sols, or fail and go to **Debrief**.

### Characters
- **Commander (player):** named (e.g., "Commander Nova"); portrait in HUD, pixel sprite in scene.
- **Crew of 4:** Engineer, Doctor, Botanist, Pilot. They show worry at low oxygen, run to shelter during flares, cheer after surviving storms.

### Base and environment
- **Base:** habitat (windows dim at low power), solar panel array (retracts in storms), battery bank, oxygen generator, CO₂ scrubber, shield dome / storm shelter, comms antenna, rover, greenhouse (Level 2).
- **Environment:** low-poly Moon surface, Earth in the sky, day/night cycle with long lunar night, dust storms, solar flares (sky flash, red beacon).

## 6. Functional requirements

Priority: **P0** = must ship, **P1** = should ship, **P2** = nice to have.

### 6.1 Core gameplay
| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Player can toggle solar panels, shield, and oxygen level each Sol | P0 |
| FR-2 | Engine resolves Power, Oxygen, Shield, and Crew Health every Sol via deterministic `tick()` | P0 |
| FR-3 | Seeded RNG so a run can be replayed or shared | P0 |
| FR-4 | Win = survive target Sols; Lose = crew health or oxygen reaches zero | P0 |
| FR-5 | Event timeline (flares, dust storms, lunar night) with a forecast shown ahead of time | P0 |
| FR-6 | Sol 214 scene: 10-second choice to retract or leave panels out | P0 |
| FR-7 | Three levels: L1 Power basics, L2 Greenhouse and oxygen, L3 Earth comms delay | P1 (L1 P0) |

### 6.2 Real NASA data
| ID | Requirement | Priority |
|---|---|---|
| FR-8 | Fetch solar flare / CME events from NASA DONKI and map them to game events | P0 |
| FR-9 | Provide 3–5 curated snapshot periods as fallback when API is unavailable | P0 |
| FR-10 | "Real event" badge and short science fact on every NASA-derived event | P1 |
| FR-11 | Calls go through a Vercel serverless proxy so the API key is never exposed | P0 |

### 6.3 UI and feedback
| ID | Requirement | Priority |
|---|---|---|
| FR-12 | HUD with 3 big gauges (Power, Oxygen, Shield) plus crew health | P0 |
| FR-13 | Alert modal for incoming events with countdown | P0 |
| FR-14 | Screens: Title, Briefing, Tutorial, Game, Debrief, Settings | P0 (Settings P1) |
| FR-15 | Debrief explains the **cause chain** ("flare hit → panels out → battery drained → oxygen fell") | P0 |
| FR-16 | Crew reactions (portrait states and sprite animations) | P0 |
| FR-17 | Sound effects and ambient music with mute toggle | P1 |
| FR-18 | Accessible: keyboard operable, colour-blind safe gauges, reduced-motion option | P1 |

### 6.4 Visuals
| ID | Requirement | Priority |
|---|---|---|
| FR-19 | HD-2D scene: pixel sprites, lit 3D diorama, tilt-shift, bloom | P0 |
| FR-20 | Lighting and sky respond to game state (night, flare, storm, low power) | P1 |
| FR-21 | Particles for dust storms and flare flash | P1 |
| FR-22 | 2D parallax fallback mode using the same engine and UI | P1 (decision at end of Day 4) |

### 6.5 Data and persistence (Supabase)
| ID | Requirement | Priority |
|---|---|---|
| FR-23 | Cache normalized DONKI events in Supabase to reduce API calls and enable offline fallback | P1 |
| FR-24 | Store anonymous run results (seed, level, outcome, Sols survived) | P1 |
| FR-25 | Simple leaderboard / "survival stats" screen (anonymous) | P2 |
| FR-26 | Game must be fully playable with Supabase unreachable (local snapshots) | P0 |

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | 60 fps target on a mid-range laptop; 30 fps minimum on tablets; initial load under 5 s on broadband |
| Asset budget | Total models under 10 MB (Draco-compressed .glb); sprites in atlases |
| Reliability | No hard dependency on any external API at runtime |
| Security | NASA key and Supabase service key only server-side; client uses Supabase anon key with Row Level Security |
| Privacy | No personal data, no login, no tracking beyond anonymous run stats; child-safe |
| Accessibility | WCAG-minded: contrast, keyboard, reduced motion, readable fonts |
| Compatibility | Latest Chrome, Edge, Firefox, Safari; iPad Safari |
| Licensing | All assets free-licensed and credited in `CREDITS.md` |

## 8. Educational content requirements

- Each event type has a **fact sheet** (what it is, real-world impact, how astronauts respond).
- README includes a **science table** mapping real concepts to game mechanics.
- Language is plain, short, and friendly for ages 9–14.
- Playtest with at least 3 kids (or kid proxies) before submission.

## 9. Success metrics

| Metric | Target |
|---|---|
| Playable build exists | By Wed 11 Nov |
| Time to first meaningful action | Under 60 seconds |
| Average run length | 3–8 minutes |
| Playtesters who can explain *why* they lost after Debrief | At least 70% |
| Playtesters who replay voluntarily | At least 50% |
| Crash-free sessions in final playtest | 100% |
| Submission | Deployed on Vercel, demo video, write-up, credits, delivered by Sun 15 Nov morning |

## 10. Scope and levels

| Level | Theme | New mechanics |
|---|---|---|
| 1 | Power basics | Solar, battery, lunar night, flares, Sol 214 choice |
| 2 | Life support | Greenhouse, oxygen/CO₂, crew health |
| 3 | Communications | Earth delay, comms antenna, delayed instructions |

MVP cut-line: **Level 1 complete and polished** → add Level 2 → add Level 3.

## 11. Team and ownership

| Member | Role | Owns |
|---|---|---|
| Dev 1 | Engine and logic | `balance.js`, `tick()`, event timeline, seeded RNG, level definitions, debrief rules, unit tests, console balance simulator |
| Dev 2 | UI and screens | HUD, controls, alert modal, Sol 214 card, forecast panel, all screens, responsive layout, accessibility |
| Dev 3 | Scene, data, deploy | R3F diorama, sprite actors, lighting, post-FX, particles, DONKI fetch and mapper, Vercel API routes, Supabase integration, deploy, performance |
| Blender member | 3D assets | Habitat, solar panels (retract animation), shield dome, antenna, terrain, rover as Draco-compressed `.glb` with names matching code |
| Design member | Art direction | Palette, style guide, pixel sprites, UI skin and icons, fonts, audio sourcing, `CREDITS.md` |
| Research member | Science and content | DONKI snapshot selection, fact sheets, README science table, all in-game text, playtests, demo script, submission write-up |

## 12. Timeline

| Day | Milestones |
|---|---|
| Mon 9 Nov | Repo and Vercel project set up (Dev 3). NASA API key and snapshot research starts (Research). Style guide draft (Design). Habitat modelling starts (Blender). Supabase project created. |
| Tue 10 Nov | Engine v0 (Dev 1). Gauges and controls (Dev 2). Placeholder scene (Dev 3). Palette and first sprites delivered (Design). 3–5 DONKI snapshots and balance notes delivered (Research). |
| Wed 11 Nov | **First playable build** (engine + HUD). First `.glb` files delivered. |
| Thu 12 Nov | Real DONKI events and post-FX wired (Dev 3). Assets **frozen** (Blender, Design). |
| Fri 13 Nov | Audio, tutorial, Debrief polish, production deploy on Vercel. README and video work begin. |
| Sat 14 Nov | Whole-team playtest and bug fixing. Demo video recorded. |
| Sun 15 Nov | Final check; submit in the morning. |

**Decision gate:** End of Day 4 (Thu 12 Nov): if HD-2D rendering is consuming time, switch to the 2D parallax fallback and keep the engine and UI.

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Blender or sprite work slips | Visual polish drops | Keep named placeholder shapes; invest in lighting instead |
| HD-2D post-FX too heavy | Low fps | Quality presets; 2D parallax fallback |
| NASA API slow, down, or rate limited | No live events | Snapshots bundled in repo plus Supabase cache; proxy with caching |
| Supabase unreachable | No stats | Game never depends on it; local-only mode |
| Balance feels unfair | Frustration | Console balance simulator; seeded runs; playtests |
| Scope creep | Missed deadline | Strict P0 / P1 / P2; Level 1 first |
| Unverified API details | Integration delays | Verify DONKI fields and rate limits on Day 1 |
| Asset licensing issues | Disqualification risk | Only CC0 / permissive; log in `CREDITS.md` |

## 14. Dependencies and assumptions

- NASA API key obtained Day 1 (free `api.nasa.gov` key).
- Free assets (Kenney, Quaternius, Poly Haven, Freesound, etc.) with compatible licences.
- Space Apps portal submission requirements to be checked and confirmed by the Research member.
- NASA API rate limits and exact DONKI field names are **not yet verified** and must be checked on install.

## 15. Submission checklist

- [ ] Deployed Vercel URL works on desktop and tablet
- [ ] Level 1 complete; Level 2 / 3 if time allows
- [ ] Real DONKI events visible and labelled; snapshot fallback tested
- [ ] Debrief cause chain works for every failure type
- [ ] README with science table and setup instructions
- [ ] `CREDITS.md` complete
- [ ] Demo video (script from Research member)
- [ ] Submission write-up
- [ ] Portal requirements double-checked

## 16. Open questions

1. Exact number of Sols per level (starter balance in `DESIGN_DOC.md`, to be tuned).
2. Whether the leaderboard (FR-25) is worth the time; default is no.
3. Final Commander name and crew names (Design + Research to decide).
