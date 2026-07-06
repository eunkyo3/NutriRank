<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-06 | Updated: 2026-07-06 -->

# docs

## Purpose
Project documentation for NutriRank. Contains architecture decision records (ADRs) that capture the *why* behind key technical choices, and agent-workflow guides that tell engineering skills/agents how to consume this repo (issue tracking, triage labels, domain docs).

## Key Files
This directory has no direct files; all content lives in its subdirectories.

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `adr/` | Architecture Decision Records — data source, grading method, grade/ranking model, and stack (see `adr/AGENTS.md`). |
| `agents/` | Agent-workflow guides: how agents use the issue tracker, triage labels, and domain docs (see `agents/AGENTS.md`). |

## For AI Agents

### Working In This Directory
- Documentation here is the source of truth for project intent while there is no application code. Keep it decision-first and concise.
- When adding a decision, prefer a new ADR in `adr/` over editing an existing one; ADRs record history and should not be silently rewritten.

### Testing Requirements
- None (Markdown only). Ensure new ADRs follow the existing numbered `NNNN-title.md` convention and keep terminology consistent with `../CONTEXT.md`.

### Common Patterns
- ADRs and CONTEXT glossary are written in Korean; agent guides are in English.

## Dependencies

### Internal
- `../CONTEXT.md` — domain glossary that ADRs and agent docs reference.
