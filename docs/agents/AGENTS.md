<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-06 | Updated: 2026-07-06 -->

# agents

## Purpose
Agent-workflow guides that tell engineering skills/agents how to operate in this repo: where issues live, how triage roles map to real labels, and how to consume the domain documentation. These are referenced from the root `AGENTS.md`.

## Key Files
| File | Description |
|------|-------------|
| `issue-tracker.md` | Issues/PRDs live as GitHub issues; use the `gh` CLI. Documents create/read/list/comment/label/close conventions and wayfinder map/ticket/dependency operations. External PRs are **not** a triage request surface. |
| `triage-labels.md` | Maps the five canonical triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) to this repo's actual label strings. |
| `domain.md` | How agents should consume domain docs before exploring: read `CONTEXT.md` and relevant `docs/adr/` files, use glossary vocabulary, and flag ADR conflicts. |

## Subdirectories
None.

## For AI Agents

### Working In This Directory
- These files are **operational contracts** consumed by skills (`/triage`, `/wayfinder`, `/domain-modeling`, etc.). Changing a convention here changes agent behavior — edit deliberately and keep the guidance internally consistent with the root `AGENTS.md`.
- The issue tracker is GitHub via `gh`; the repo is inferred from `git remote -v`.
- Domain-docs guidance assumes a single-context layout; if the repo becomes multi-context, update `domain.md` and add a root `CONTEXT-MAP.md`.

### Testing Requirements
- None (Markdown only). If you change the triage label strings, ensure they match the labels actually configured in the GitHub repo.

### Common Patterns
- Written in English (unlike the Korean domain glossary and ADRs).
- Guides map generic skill vocabulary → this repo's concrete tools and label strings.

## Dependencies

### Internal
- `../../CONTEXT.md` and `../adr/` — the domain docs that `domain.md` directs agents to read.

### External
- **GitHub `gh` CLI** — all issue-tracker operations described in `issue-tracker.md`.
