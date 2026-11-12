# Design Doc — Junior Astronaut Mission Trainer (HD-2D Edition)

Companion to `PRD.md` and `TECH_STACK.md`.

---

## 1. Design pillars

1. **Cause and effect you can see.** Every decision visibly changes the base, the crew, and the gauges.
2. **Real data, kid language.** NASA events appear as story moments with one-line facts.
3. **Care about the crew.** Named characters with reactions create emotional stakes.
4. **Short and replayable.** 3–8 minute runs; different events each replay.
5. **Beautiful at small scale.** HD-2D: pixel sprites in a lit 3D diorama, tilt-shift, bloom.

## 2. Game overview

You are the **Mission Commander** of a small lunar outpost. Keep the crew alive for a set number of Sols (lunar days). Each Sol you spend limited power, then the game resolves events. A Debrief explains what happened.

### Characters

| Character | Role | Personality hook | Reactions |
|---|---|---|---|
| Commander (e.g., "Nova") | Player avatar | Calm, decisive | Portrait in HUD, pixel sprite in scene |
| Engineer | Power and repairs | Practical, jokes under stress | Taps panels, worried at low power |
| Doctor | Crew health | Gentle, cautious | Checks crew when oxygen drops |
| Botanist | Greenhouse (L2) | Cheerful, nature-loving | Celebrates harvest, sad when plants fail |
| Pilot | Rover and comms | Bold, restless | Drives rover, anxious during comms blackout |

Names and short bios are finalized by Design + Research.

**Reaction states (portrait and sprite):** idle, worried (low oxygen), run-to-shelter (flare), cheer (survived storm), exhausted (low power night).

## 3. Core loop

```
Read forecast → Allocate power → Next Sol → tick() resolves → Visual/audio feedback → Repeat
                                                           ↘ Fail → Debrief → Replay with new seed/events
                                                           ↘ Win  → Level complete
```

### Player actions per Sol
- Toggle **solar panels** (extended / retracted)
- Toggle **shield** on / off
- Set **oxygen level** (low / normal / high)
- (L2) Water and tend **greenhouse**
- (L3) Queue **comms** messages with Earth delay

### Trade-offs
| Choice | Benefit | Cost |
|---|---|---|
| Panels out | Max solar power | Vulnerable to storms and flares |
| Panels retracted | Safe | No generation |
| Shield on | Blocks flare damage | Drains power |
| High oxygen | Healthier crew | Drains power and oxygen supply |
| Low oxygen | Saves power | Crew health decays |

## 4. Resources and gauges

| Gauge | Range | Drains when | Fails when |
|---|---|---|---|
| Power (battery) | 0–100 | Night, shield, oxygen systems | 0 → systems shut down |
| Oxygen | 0–100 | Crew consumption, generator offline | 0 → crew health collapses |
| Shield | 0–100 | Flare hits, storms | 0 → flare damage unmitigated |
| Crew health | 0–100 per crew | Low oxygen, radiation, cold | 0 → crew member lost; all lost = game over |

## 5. Events

| Event | Source | Effect | Counterplay | Visual / audio |
|---|---|---|---|---|
| Solar flare | NASA DONKI (FLR) | Radiation spike; damages unshielded crew and panels | Shield on, crew to shelter, retract panels | Sky flash, red beacon, siren |
| CME (coronal mass ejection) | NASA DONKI (CME) | Delayed, longer storm | Plan ahead using forecast | Aurora-like sky tint, rumble |
| Dust storm | Scripted / seeded | Reduces solar output; clogs panels | Retract panels, run on battery | Tan haze, drifting particles |
| Lunar night | Day/night cycle | No solar for ~2 weeks (compressed) | Charge battery in advance, lower consumption | Dark sky, Earthlight, dim windows |
| Comms delay (L3) | Scripted | Orders from Earth arrive late | Act on forecast, don't wait | Antenna pulse, delayed message UI |
| **Sol 214 scene** | Scripted hero moment | Big flare incoming | 10-second choice: retract panels or leave out | Countdown card, music swell |

### Sol 214 scene
A 10-second countdown card appears with a forecast and crew voices. Retracting protects panels but cuts power; leaving them out keeps power but risks heavy damage. Both outcomes feed the Debrief and lead to different branches.

### NASA event mapping
| DONKI field (to verify) | Game mapping |
|---|---|
| Flare class (C / M / X) | Severity: minor / major / extreme |
| Begin / peak time | Day of event on the Sol timeline (time-compressed) |
| Active region / source | Flavour text in the alert |
| CME speed | Warning lead time (faster = less warning) |

Each real event shows a **"Real NASA event"** badge with date and one-line fact.

## 6. Levels

| Level | Theme | Sols (starter) | Introduces |
|---|---|---|---|
| 1 | Power basics | 14 | Solar, battery, night, flares, Sol 214 choice |
| 2 | Life support | 21 | Greenhouse, oxygen and CO₂, crew health |
| 3 | Communications | 28 | Earth delay, antenna, delayed guidance |

### Starter balance numbers (to be tuned with the simulator)
| Parameter | Value |
|---|---|
| Starting battery | 80 |
| Solar generation (panels out, day) | +18 / Sol |
| Base consumption | −8 / Sol |
| Shield cost | −6 / Sol |
| Night | 0 solar for 3 Sols per cycle |
| Dust storm | solar × 0.3 for 2 Sols |
| Flare (major, unshielded) | −25 shield, −10 crew health each |
| Oxygen consumption | −2 per crew-Sol (normal) |
| Flare shield mitigation | 80% damage reduction |

Dev 1 owns the final numbers; target win rate for a first-time player is around 40–60%.

## 7. Base (diorama)

| Object | Behaviour | Asset owner |
|---|---|---|
| Habitat | Windows glow, dim at low power | Blender |
| Solar panel array | Extend / retract animation; dust overlay | Blender |
| Battery bank | Glow level matches power | Blender / Design |
| Oxygen generator + CO₂ scrubber | Hum animation, warning light | Blender |
| Shield dome / shelter | Translucent glow when on | Blender |
| Comms antenna | Pulse on message (L3) | Blender |
| Rover | Decor and cutscenes | Blender |
| Greenhouse (L2) | Plant growth stages | Blender / Design |
| Terrain | Low-poly craters and ridges | Blender |

**Naming rule:** model node names must match code (`Habitat`, `SolarArray`, `ShieldDome`, `Antenna`, `Rover`, `Greenhouse`, `Terrain`).

## 8. Environment and visual style

### HD-2D recipe
- **Sprites:** pixel-art billboards (nearest-neighbour filtering) in a 3D scene.
- **Lighting:** one directional "sun," ambient fill, point lights for windows and beacons.
- **Post-FX:** tilt-shift (depth of field band), bloom on emissive materials, subtle vignette.
- **Camera:** slightly angled, fixed diorama view with gentle parallax; no free camera.
- **Sky:** star field, Earth in the sky, flare flash overlay.

### Lighting by game state
| State | Lighting |
|---|---|
| Day | Warm white sun, long shadows |
| Night | Blue-black sky, Earthlight, glowing windows |
| Flare | White flash, then red beacon pulse |
| Dust storm | Tan fog, reduced sun, drifting particles |
| Low power | Windows flicker, gauges pulse red |

### Palette (draft; Design finalizes by Tue 10 Nov)
| Role | Colour |
|---|---|
| Moon surface | Warm grey `#8A8D99` |
| Shadow | Deep indigo `#1C1F3A` |
| Sun highlight | Soft cream `#FFF1C9` |
| Power | Amber `#FFB020` |
| Oxygen | Cyan `#35D0E6` |
| Shield | Violet `#8E6CFF` |
| Alert | Red `#FF4D4D` |
| Dust | Tan `#C9A878` |

Gauge states must not rely on colour alone: each gauge also has an icon and a numeric value.

### Sprite specs
- Base sprite size: 32×48 px characters, 64×32 rover (finalized by Design).
- Same palette and outline style across all sprites.
- Animations: idle (2f), walk (4f), worried (2f), run (4f), cheer (3f).
- Delivered as sprite sheets / atlases with a JSON frame map.

## 9. UI design

### Screens
| Screen | Purpose |
|---|---|
| Title | Logo, Start, Settings, Credits |
| Briefing | Story, level goals, crew introductions |
| Tutorial | 3–4 guided steps (gauges, toggles, forecast, Next Sol) |
| Game | Diorama + HUD |
| Alert modal | Incoming event, countdown, quick actions |
| Sol 214 card | 10-second decision |
| Debrief | Result, cause chain, tips, Replay / Next level |
| Settings | Volume, reduced motion, quality preset, colour-blind mode |

### HUD layout
- **Top:** Sol counter, level, real-event badge.
- **Left:** crew portraits with health bars and mood.
- **Right:** Forecast panel (next 3–5 Sols).
- **Bottom:** 3 large gauges (Power, Oxygen, Shield), control toggles, **Next Sol** button.

### Debrief design
The Debrief shows a **cause chain** as 3–5 linked cards, e.g.:

`Flare hit` → `Panels left out` → `Battery drained` → `Oxygen systems off` → `Crew health fell`

Each card has a one-line science explanation and a "Try this instead" tip. Buttons: **Replay (new events)**, **Try same seed**, **Next level**.

### Writing guidelines (Research + Design)
- Reading level: ages 9–14; sentences under 15 words.
- One science fact per event, max two lines.
- Encouraging tone; failure is "mission learning," never punishing.

## 10. Audio

- Music: calm ambient loop; tension layer during events (CC0 / permissive sources).
- SFX: button click, gauge warning, siren, flare whoosh, dust wind, cheer, panel motor.
- Mute and volume sliders in Settings. Audio starts only after first user interaction.
- Priority: **sprites before music** if time is short.

## 11. Animation list (minimum)

| Item | Animation |
|---|---|
| Solar panels | Extend / retract (Blender) |
| Shield dome | Fade in / out with shimmer |
| Crew sprites | Idle, walk, worried, run, cheer |
| Rover | Drive loop (cutscenes) |
| Antenna | Pulse |
| Sky | Flare flash, day/night transition |
| UI | Gauge tween, alert slide-in, countdown ring |

## 12. Fallback design (2D parallax mode)

If HD-2D slips, a 2D side-view layered parallax scene replaces the 3D scene. Same engine, same HUD, same sprites; only the `Scene` component changes. Decision gate: end of Thu 12 Nov.

## 13. Accessibility

- Keyboard-operable controls and visible focus rings.
- Icons and numbers on gauges in addition to colour.
- Reduced-motion setting disables screen flash, shake, and heavy particles.
- Flash effects limited to avoid photosensitivity issues (no rapid strobing).
- Minimum 16 px body text; readable pixel-friendly font for headings.

## 14. Asset pipeline

1. Blender exports Draco-compressed `.glb` with named nodes.
2. Design delivers sprite sheets plus palette file.
3. Dev 3 imports into `/public/models` and `/public/sprites`; placeholder boxes used until delivery.
4. Assets frozen Thu 12 Nov.
5. `CREDITS.md` updated with every external asset (name, author, licence, link).

### Free asset sources (check licence per asset)
Kenney, Quaternius, Poly Haven, Freesound, OpenGameArt, itch.io free packs.

## 15. Playtest plan

- Wed 11 Nov: internal first-playable check.
- Fri 13 Nov: 2–3 outside testers.
- Sat 14 Nov: whole-team playtest; fix top issues only.
- Questions: Did you understand why you lost? What was confusing? Did you want to replay?

## 16. Handoffs summary

| From | To | What | When |
|---|---|---|---|
| Design | Dev 2, Dev 3 | Palette, sprite sizes | Tue 10 Nov |
| Research | Dev 1, Dev 3 | DONKI snapshots, balance reference | Tue 10 Nov |
| Blender | Dev 3 | First `.glb` files | Wed 11 Nov |
| Blender and Design | Dev 3 | Frozen assets | Thu 12 Nov |
| Dev 1 | Dev 2 | Store shape and engine API | Tue 10 Nov |
