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
| `0007-category-is-authoritative-for-product-type.md` | 제품유형은 기준량 표기가 아니라 소비자 카테고리가 정한다. 표기로 역산하면 100g으로 적힌 주스에 고형 컷오프가 걸려 같은 점수에 다른 등급이 나온다(실측 2,376건). 새 카테고리는 제품유형 선언이 필수. |
| `0006-grade-skew-and-relative-discovery.md` | D·E가 79.2%로 쏠리는 것은 음료·과자로 범위를 한정한 결과이므로 컷오프를 조정하지 않고 전제로 받아들인다. 카테고리 내 상대 순위·등급 필터·카테고리 비교로 변별력을 확보하고, 쏠림을 화면에서 먼저 설명한다. |

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
