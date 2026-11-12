# MOONWATCH: Sol 214 — Pre-Deploy Checklist & Rollback Plan

**Vercel Project:** `moonwatch-214` (`prj_yKzYBd3HX7iZoAhFxbK956T8ZfT8`)
**Vercel Team Scope:** `team_sTAxhaiIdAafFgZQy32W1Yq1`
**Supabase Project:** `bqbvmluwatdgxbiqvnsx` (`junior-astronaut`)
**Workspace:** `"C:\WEB-DEV"`

---

## 1. Pre-Deploy Checklist

- [x] **Lint (`npm run lint`)**: 0 errors, 0 warnings across `src/`, `api/`, and `scripts/`.
- [x] **Unit & Security Tests (`npm test`)**: 28/28 tests passing (`src/engine/__tests__/engine.test.js`, `src/engine/__tests__/backend_and_security.test.js`).
- [x] **Monte-Carlo Balance Simulator (`npm run simulate`)**: Level 1 first-time win rate = 49.8% (within 40%–60% target).
- [x] **Secret Scan (`npm run secret-scan`)**: 0 leaked secrets in working tree or git history.
- [x] **Dependency Audit (`npm audit`)**: 0 vulnerabilities across 352 audited packages.
- [x] **Production Bundle (`npm run build`)**: 406.13 kB gzipped total (well below 1.5 MB gzipped budget).
- [x] **QA Playtest (`@Chrome DevTools` / Browser Subagent)**: 11 full runs across Levels 1–3, all event types (`FLR`, `CME`, `DUST`, `NIGHT`, `COMMS`, `SOL214`), Desktop (`1280×800`) & Tablet (`768×1024`), and Offline Mode with 0 crashes.

---

## 2. Environment Variables (Production & Preview)

| Variable | Visibility | Target Environments | Purpose |
|---|---|---|---|
| `NASA_API_KEY` | Server-only (Sensitive) | Production, Preview | Live NASA CCMC DONKI `/FLR` & `/CME` proxy in `/api/donki` |
| `SUPABASE_URL` | Server-only | Production, Preview | Server-side Supabase URL for `/api/donki` & `/api/runs` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (Sensitive) | Production, Preview | Server-only key for `donki_cache` upsert & `runs` insert |
| `VITE_SUPABASE_URL` | Client (`VITE_`) | Production, Preview | Public RLS-protected Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Client (`VITE_`) | Production, Preview | Public RLS-protected Supabase anon key |

---

## 3. Instant Rollback Plan

### A. Instant Production Rollback via Vercel CLI
1. List recent production deployments:
   ```bash
   npx vercel ls moonwatch-214 --prod --scope team_sTAxhaiIdAafFgZQy32W1Yq1
   ```
2. Roll back traffic immediately to the previous known-good deployment (zero rebuild required):
   ```bash
   npx vercel rollback <previous-deployment-url-or-id> --scope team_sTAxhaiIdAafFgZQy32W1Yq1
   ```
3. Verify rollback status:
   ```bash
   npx vercel rollback status --scope team_sTAxhaiIdAafFgZQy32W1Yq1
   ```

### B. Database & Cache Rollback Safety (`bqbvmluwatdgxbiqvnsx`)
- `public.donki_cache` is a disposable 6-hour read-through cache; if a bad release wrote invalid cache entries, run `TRUNCATE TABLE public.donki_cache;` without affecting any run telemetry.
- Both `/api/donki` and `/api/runs` degrade gracefully to bundled `/snapshots/*.json` and silent telemetry no-op if Supabase credentials are rotated or paused.
