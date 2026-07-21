<!-- Generated: 2026-07-06 | Updated: 2026-07-06 -->

# NutriRank

## Purpose
NutriRank is a service that lets users judge the healthiness of beverages and snacks at a glance — via an absolute A–E health grade and a within-category ranking — without having to interpret a nutrition facts label themselves. It is a **working Next.js 15 application**: a batch pipeline ingests MFDS processed-food open data, precomputes health scores/grades/category rankings into SQLite, and the App Router screens read only those precomputed tables (ADR-0004, ADR-0005). A full data snapshot (~48k products) is distributed via GitHub Releases — see the README.

## Key Files
| File | Description |
|------|-------------|
| `CONTEXT.md` | Domain glossary (ubiquitous language) — canonical Korean terms for grades, categories, ranking, and data concepts. Read before naming any domain concept. |
| `README.md` | Setup, data-snapshot distribution, and the Nutri-Score / MFDS grading background. |
| `package.json` | pnpm scripts: `dev`, `build`, `test`, `test:e2e`, `ingest`, `db:migrate`, `db:seed`. |
| `.env.example` | Environment variable template. Copy to `.env.local` (git-ignored) and fill in the data.go.kr public-data service key. Only needed for ingest / on-demand search — reading a snapshot needs no key. |
| `Dockerfile`, `docker-compose.yml` | Host-agnostic single image + volume-mounted SQLite (ADR-0005). |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `app/` | App Router screens: home, search, product detail, category ranking, analytics dashboard, guide. |
| `db/` | Drizzle schema, migrations, seed, read/write SQLite clients, and the screens' read queries. |
| `lib/` | `grading/` (2023 Nutri-Score implementation), `display.ts` (presentation helpers), `stats.ts`. |
| `scripts/ingest/` | 12-stage batch pipeline: fetch → parse → dedup → map → grade → rank → aggregate → quality gate → atomic swap. |
| `test/` | Vitest unit tests + Playwright e2e (`test/e2e/`). |
| `docs/` | ADRs, agent-workflow guides, and API/algorithm reference notes (see `docs/AGENTS.md`). |

## For AI Agents

### Working In This Directory
- **Read `CONTEXT.md` first.** When your output names a domain concept (issue title, hypothesis, test name, code identifier), use the term exactly as defined in the glossary and avoid the listed synonyms.
- **Read relevant ADRs** in `docs/adr/` before working in an area. If your output contradicts an ADR, surface it explicitly rather than silently overriding it.
- The repo uses a **single-context** domain-docs layout. If it later becomes multi-context, add a `CONTEXT-MAP.md` at the root pointing at one `CONTEXT.md` per context.
- **Package manager is pnpm** (`corepack pnpm ...` works without a global install). `better-sqlite3` is native and listed in `pnpm.onlyBuiltDependencies`.
- **Screens never compute grades or ranks at request time** (ADR-0004). If a screen needs a new number, add it to the batch pipeline and the precomputed tables — not to the page.
- The app opens SQLite **read-only**; the ingest batch is the single writer and swaps tables in one transaction. Do not add writes to the request path.
- Changing grading output (`lib/grading`) or the rationale payload invalidates the published snapshot — it requires a re-ingest, not just a code change.

### Testing Requirements
- `corepack pnpm test` — Vitest unit suite (currently 111 tests). Must pass before any change is considered done.
- `corepack pnpm exec tsc --noEmit` — TypeScript is strict; keep it clean.
- `corepack pnpm test:e2e` — Playwright smoke test; needs a dev server and a snapshot in `data/`.
- To exercise screens locally, download a snapshot into `data/nutrirank.sqlite` (README) — no API key required.

### Common Patterns
- Documentation is written in **Korean** (domain glossary and ADRs); agent-workflow docs are in English. UI copy is Korean.
- ADRs are short, decision-first Markdown files named `NNNN-title.md`.
- Query functions take a `db` argument so they are unit-testable against in-memory SQLite; pages pass `tryGetReadDb()`.
- 미측정(NULL) is never coerced to 0 — it renders as "—" and can make a product `ungradable`.

## Dependencies

### External
- **data.go.kr / MFDS** — "전국통합식품영양성분정보(가공식품) 표준데이터" (dataset 15100066) is the nutrition data source (see `docs/adr/0001`). License: 출처표시 — the attribution in the README and the app footer must be kept.
- **Next.js 15 / React 19 / Drizzle / better-sqlite3 / Tailwind 3** — application stack (see `docs/adr/0004`, `0005`).
- **Recharts** — dashboard scatter plot (client component only).
- **Vitest / Playwright** — unit and e2e test runners.

<!-- MANUAL: The section below is the original hand-authored agent guide and is preserved on regeneration. -->

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues; external PRs are not treated as a triage request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The repo uses the default mattpocock/skills triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.
