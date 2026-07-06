<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-06 | Updated: 2026-07-06 -->

# adr

## Purpose
Architecture Decision Records for NutriRank. Each ADR is a short, decision-first Markdown file capturing a single technical choice, its rationale, and the options considered. Together they define the intended architecture before code exists.

## Key Files
| File | Description |
|------|-------------|
| `0001-data-source-mfds-processed-food.md` | Adopt MFDS/data.go.kr integrated processed-food nutrition standard data as the source (brand-level, 100g/100ml, free & public). |
| `0002-grading-nutriscore-adaptation.md` | Compute the A–E health grade using a Nutri-Score adaptation tuned for available Korean public data, with a beverage/solid split. |
| `0003-absolute-grade-relative-ranking.md` | Health grade is an absolute A–E scale; category ranking sorts the shared absolute health score within a consumer category (single score axis avoids grade/rank contradictions). |
| `0004-precomputed-nextjs-fullstack.md` | Next.js full-stack over a single DB (initially SQLite) with a batch pipeline that precomputes scores/grades/rankings; all screens read precomputed values. |
| `0005-docker-sqlite-stack.md` | Concretizes ADR-0004 into a stack: host-agnostic Docker single image + volume SQLite (app read-only, batch writer, WAL), better-sqlite3 + Drizzle, TypeScript/Next.js App Router, Vitest + Playwright, Tailwind. |

## Subdirectories
None.

## For AI Agents

### Working In This Directory
- **Add, don't rewrite.** Record a new decision as the next-numbered `NNNN-title.md`. Only edit an existing ADR to mark it superseded or correct a factual error.
- Before working in an application area later, read the ADRs touching it. If your proposed change contradicts an ADR, flag it explicitly (e.g. "_Contradicts ADR-0003 …_") rather than overriding it silently.
- Keep the decision statement first and follow with a "Considered Options" section where relevant, matching the existing files.

### Testing Requirements
- None (Markdown only). Verify terminology matches `../../CONTEXT.md`.

### Common Patterns
- Filenames: zero-padded sequential number + kebab-case title.
- Content is in Korean, decision-first, with brief rationale and rejected alternatives.

## Dependencies

### Internal
- `../../CONTEXT.md` — glossary terms used throughout the ADRs (health grade, health score, consumer category, reference amount, etc.).
