<!-- Generated: 2026-07-06 | Updated: 2026-07-06 -->

# NutriRank

## Purpose
NutriRank is a service that lets users judge the healthiness of beverages and snacks at a glance — via an absolute A–E health grade and a within-category ranking — without having to interpret a nutrition facts label themselves. This repository is currently in the **planning and design stage**: it holds the domain glossary, architecture decision records (ADRs), and agent-workflow docs. There is no application source code yet; the intended stack is a Next.js full-stack app with a precompute batch pipeline over public MFDS processed-food data (see `docs/adr/`).

## Key Files
| File | Description |
|------|-------------|
| `CONTEXT.md` | Domain glossary (ubiquitous language) — canonical Korean terms for grades, categories, ranking, and data concepts. Read before naming any domain concept. |
| `.env.example` | Environment variable template. Copy to `.env.local` (git-ignored) and fill in the data.go.kr public-data service key. |
| `.gitignore` | Ignore rules for Node/Next.js builds, secrets, raw data dumps, and local SQLite databases. |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `docs/` | Project documentation: ADRs and agent-workflow guides (see `docs/AGENTS.md`). |

## For AI Agents

### Working In This Directory
- **Read `CONTEXT.md` first.** When your output names a domain concept (issue title, hypothesis, test name, code identifier), use the term exactly as defined in the glossary and avoid the listed synonyms.
- **Read relevant ADRs** in `docs/adr/` before working in an area. If your output contradicts an ADR, surface it explicitly rather than silently overriding it.
- The repo uses a **single-context** domain-docs layout. If it later becomes multi-context, add a `CONTEXT-MAP.md` at the root pointing at one `CONTEXT.md` per context.
- No build/test tooling exists yet — this is a docs-only repo at present. Do not assume a `package.json` or test runner.

### Testing Requirements
- No automated tests yet. When application code is introduced, add a testing section here and to the relevant subdirectory `AGENTS.md`.

### Common Patterns
- Documentation is written in **Korean** (domain glossary and ADRs); agent-workflow docs are in English.
- ADRs are short, decision-first Markdown files named `NNNN-title.md`.

## Dependencies

### External
- **data.go.kr / MFDS** — "전국통합식품영양성분정보(가공식품) 표준데이터" is the planned nutrition data source (see `docs/adr/0001`).
- **Next.js + SQLite (initial)** — planned application stack (see `docs/adr/0004`).

<!-- MANUAL: The section below is the original hand-authored agent guide and is preserved on regeneration. -->

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues; external PRs are not treated as a triage request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The repo uses the default mattpocock/skills triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.
