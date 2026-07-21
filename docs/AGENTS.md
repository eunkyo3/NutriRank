<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-06 | Updated: 2026-07-06 -->

# docs

## Purpose
Project documentation for NutriRank. Contains architecture decision records (ADRs) that capture the *why* behind key technical choices, agent-workflow guides that tell engineering skills/agents how to consume this repo, and reference notes transcribing external specs (the grading tables and the source API) so implementation does not have to re-derive them.

## Key Files
This directory has no direct files; all content lives in its subdirectories.

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `adr/` | Architecture Decision Records — data source, grading method, grade/ranking model, and stack (see `adr/AGENTS.md`). |
| `agents/` | Agent-workflow guides: how agents use the issue tracker, triage labels, and domain docs (see `agents/AGENTS.md`). |
| `reference/` | Transcribed external specs: `nutriscore-2023-tables.md` (point thresholds `lib/grading` implements), `datagokr-15100066-api.md` (source API), `partial-search-options.md`. |

## For AI Agents

### Working In This Directory
- ADRs record *why*; `reference/` records *what an external standard says*. Keep them separate — a threshold change is a reference correction, a stack change is a new ADR.
- `reference/nutriscore-2023-tables.md` is the source of truth for the numbers in `lib/grading/point-table.ts` and `tables.ts`. If you change one, change both and cite the upstream source.
- When adding a decision, prefer a new ADR in `adr/` over editing an existing one; ADRs record history and should not be silently rewritten.

### Testing Requirements
- None (Markdown only). Ensure new ADRs follow the existing numbered `NNNN-title.md` convention and keep terminology consistent with `../CONTEXT.md`.

### Common Patterns
- ADRs and CONTEXT glossary are written in Korean; agent guides are in English.

## Dependencies

### Internal
- `../CONTEXT.md` — domain glossary that ADRs and agent docs reference.
