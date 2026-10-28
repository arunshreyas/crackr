# Crackrr v1.5 Quality Assurance & Test Execution Report

**Target Release:** v1.5 Production Release  
**Date of Audit:** October 28, 2026  
**Auditor / QA Lead:** Senior QA Automation Engineer  
**Branch:** `test/v1-5-regression-suite`  
**Platform Stack:** Next.js 16.3.6 (App Router), React 19.2.8, TypeScript 5, Tailwind CSS v4, Clerk, Prisma 7.10.0, PostgreSQL (pg driver adapter)

---

## 1. Executive Summary

A comprehensive quality assurance audit and automated test suite implementation was executed for Crackrr v1.5. The regression test suite authoritatively verifies all core features:
1. **Authentication and Access Control** (Multi-tenant isolation, Clerk JWT resolution, server-side authorization).
2. **Weak Concept Analysis** (Canonical taxonomy audit, attempt tracking, pacing metrics, diagnostic tagging, urgency scoring).
3. **Smart Revision Notes with Visual Explanations** (Persistence, idempotency, KaTeX math parsing, Cartesian coordinate SVG diagram generation, cascade safety).
4. **Smart Revision** (Explainable prioritisation scoring, deterministic spaced repetition intervals, due-date calculation, review state transitions, zero-history clean slates).
5. **Practice, Gamification (XP & Streaks), and Cross-Feature Integration** (Session lifecycle, server-verified answer checking, level-scaled penalties, rank tiers, multi-session management, and dashboard synchronization).

All 147 automated tests, linters, TypeScript type checks, and Next.js production builds completed with **100% pass rate** and **zero defects remaining**.

---

## 2. Test Execution Summary

| Test Suite / Command | Scope / Category | Total Tests | Passed | Failed | Skipped | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npm run lint` | ESLint rules & code style | N/A | 0 errors | 0 | 0 | 4.2s |
| `npm run typecheck` | TypeScript compiler (`tsc --noEmit`) | N/A | 0 errors | 0 | 0 | 1.8s |
| `npm run test:unit` | Unit calculation & logic tests | 70 | 70 | 0 | 0 | 0.4s |
| `npm run test:ingest` | JEE PYQ ingestion validation | 10 | 10 | 0 | 0 | 0.1s |
| `npm run test:regression` | Multi-tenant isolation & DB integration | 20 | 20 | 0 | 0 | 19.0s |
| `test-smart-revision.ts` | Smart Revision system verification | 9 | 9 | 0 | 0 | 12.0s |
| `test-smart-notes.ts` | Smart Notes & diagram pipeline | 7 | 7 | 0 | 0 | 5.2s |
| `test-weak-concept-full.ts`| 7-Stage Weak Concept analysis | 7 | 7 | 0 | 0 | 14.0s |
| `test-practice-resume.ts` | Multi-session practice & resume | 9 | 9 | 0 | 0 | 11.0s |
| `test-daily-rewards-xp.ts`| Daily rewards & level-scaled XP | 3 | 3 | 0 | 0 | 4.0s |
| `test-ranks-leaderboard.ts`| Multi-category rank tiers | 7 | 7 | 0 | 0 | 5.0s |
| `test-dashboard-mobile-nav`| Dashboard hero & returning users | 2 | 2 | 0 | 0 | 8.0s |
| `test-dashboard.ts` | Brand-new, active, & daily goal flows | 3 | 3 | 0 | 0 | 9.0s |
| `npm run build` | Next.js production build | 18 routes | 18 routes | 0 | 0 | 6.8s |
| **TOTAL** | **Comprehensive Regression Suite** | **147** | **147** | **0** | **0** | **~1.7 min** |

---

## 3. Detailed Results by Feature Area

### A. Authentication & Access Control
- **Unauthenticated Access (AUTH-01)**: Verified `requireAuthenticatedUser()` immediately halts unauthenticated operations with `UNAUTHORIZED` error.
- **Multi-Tenant Note Isolation (AUTH-03, AUTH-04)**: Verified that User B querying notes returns 0 notes; direct lookup by note ID of User A returns `null`. Attempting to modify or delete User A's note throws `Revision note not found or unauthorized`.
- **Multi-Tenant Revision Isolation (AUTH-05)**: Verified User B with fresh account sees 0 revision items, 0 incorrect answers, and 0 saved notes.
- **Route Guards (AUTH-06)**: POST to `/api/coverage` and `/api/progress` returns `405 Method Not Allowed`, preventing direct client manipulation of user progress.
- **Cross-User Session Protection (AUTH-07)**: Verified that practice answer submissions are rejected with `FORBIDDEN` if the session does not belong to the authenticated user.

### B. Weak Concept Analysis
- **Taxonomy Integrity (WEAK-01)**: 9,823 questions audited across 91 chapters and 476 canonical concepts. Null topics (6 questions) safely fall back to chapter names without error.
- **Zero-Attempt Safety (WEAK-02)**: Evaluated 0 attempts group. Returns accuracy 0, urgency 25, no `NaN` or divide-by-zero exceptions. Health score defaults to 100%.
- **Sample Size Guard (WEAK-03)**: Verified that 1 wrong attempt or 2 attempts with 50% accuracy is classified as `INSUFFICIENT_DATA`, preventing premature labeling of concepts as weak.
- **Critical Weakness Classification (WEAK-04)**: Verified that 2 attempts with 0% accuracy or 3+ attempts with < 45% accuracy triggers `CRITICAL_WEAKNESS` with urgency scores 80-100.
- **Diagnostic Root-Cause Tags (WEAK-05)**:
  - `CARELESS_RUSH`: Triggered when questions are answered wrong in < 15 seconds.
  - `TIME_TRAP`: Triggered when average response time exceeds 110 seconds or struggling attempts >= 2.
  - `CONCEPT_GAP`: Triggered when foundational easy/medium accuracy is < 50%.
  - `DIFFICULTY_CEILING`: Triggered when easy accuracy is high (>=75%) but medium accuracy drops (<=40%).
- **Trend Detection (WEAK-06)**: Accurately identifies `IMPROVING` (+15% recent delta) and `DECLINING` (-15% recent delta) trajectories.

### C. Smart Revision Notes & Visual Explanations
- **Persistence & Formatting (NOTE-01, NOTE-03)**: Notes persist with high-yield takeaways and personal reflections. LaTeX formulas parse cleanly through KaTeX; Plain-TeX macros like `\buildrel` are converted to `\xrightarrow{}`.
- **Idempotent Save (NOTE-02)**: Duplicate note creation on `(userId, questionId)` updates existing records without duplicate rows, enforced by database unique constraint.
- **Explanation Step Parsing (NOTE-04, NOTE-05)**: Multi-paragraph worked solutions partition into ordered logical steps ("Step 1", "Step 2", etc.) and consolidate into 3 phases if > 6 steps.
- **Diagram Rendering (NOTE-06)**: CDN `<source>` tags wrap in responsive `<picture>` elements with fallback `<img>`. Geometry chapters render responsive SVG Cartesian coordinate grids.
- **Cascade Deletion Safety (NOTE-07)**: Deleting a user note removes the note but strictly preserves the underlying `Question` in the question bank.

### D. Smart Revision Queue & Spaced Repetition
- **Spaced Repetition Intervals (REV-01)**:
  - `NEEDS_PRACTICE`: exactly +1 day.
  - `REVIEWED` Cycle 1: exactly +3 days.
  - `REVIEWED` Cycle 2: exactly +7 days.
  - `REVIEWED` Cycle 3: exactly +14 days.
  - `REVIEWED` Cycle 4+: exactly +30 days.
- **Due Date Checking (REV-02)**: Items with past dates or `null` scheduled dates return `isDue: true`. Future dates return `isDue: false`.
- **Explainable Prioritization (REV-03)**: Priority scores incorporate base weakness level, missed question volume, diagnostic tags, trend bonus/penalty, spaced repetition due boost (+25), cooling-off penalty for reviews within 24h (-30), and saved notes bonus (+5). Clamped strictly between 0 and 100.
- **Clean Slate (REV-04)**: Fresh user with 0 history receives empty queue `[]` with zero fabricated items.
- **Review Action Idempotency (REV-06)**: Rapid duplicate clicks within 5 seconds do not inflate `reviewCount`. State transition to `NEEDS_PRACTICE` advances cycle counter safely.
- **Resilience (REV-08)**: Standalone revision records without questions or notes are handled gracefully without exceptions.

### E. Practice, Gamification & Regressions
- **Answer Security (PRAC-02)**: Client-facing questions omit `correctOption` and `explanation`. Answer evaluation occurs strictly on the server.
- **Submission Idempotency (PRAC-03)**: Database unique constraint `@@unique([sessionId, questionId])` prevents duplicate answers and duplicate XP awards on rapid double-clicks.
- **Level-Scaled Answer XP (PRAC-04, PRAC-05)**:
  - Correct: always +20 XP.
  - Wrong: Level 1 (+1 XP novice token); Level 2-3 (0 XP); Level 4-6 (-2 XP penalty); Level 7-10 (-5 XP penalty); Level 11+ (-10 XP competitive penalty).
  - XP is floored at 0; negative penalties never result in a negative XP balance.
- **Streak & Ranks (PRAC-06, PRAC-09)**: Same-day practice maintains streak; consecutive day practice increments streak; missed days reset streak to 1 while preserving `longestStreak`. Four multi-category rank tiers (Mastery XP, Accuracy, Streak, Volume) compute accurately.
- **Multi-Session Resumption (PRAC-07)**: Concurrent active sessions across different subjects are tracked and resumed at the exact unanswered question index.
- **Daily Login Reward (PRAC-08)**: 7-day reward track (20, 25, 30, 35, 40, 50, 75 XP) claims once per calendar day with idempotent repeated claims.

---

## 4. Bugs Discovered & Fixed During Audit

1. **Defect 1 — Phantom Empty Step Card on Whitespace/Image-Only Explanations**:
   - *Location:* `components/notes/VisualExplanation.tsx` (`parseExplanationSteps`)
   - *Issue:* When an explanation contained only whitespace or raw `<source>` tags that were stripped, `cleaned` became empty string `""`. Because `rawParagraphs.length <= 1`, the function returned `[{ title: 'Worked Solution', content: '' }]`, rendering a blank step card in the UI.
   - *Fix:* Added early exit guard `if (!cleaned) return [];`.
   - *Regression Test:* Covered in `tests/unit/visual-explanation.test.ts`.

2. **Defect 2 — Test Dashboard Standalone Execution Crash**:
   - *Location:* `scripts/test-dashboard.ts`
   - *Issue:* Running `scripts/test-dashboard.ts` threw `Error: This module cannot be imported from a Client Component module` because it directly imported `lib/prisma` which imports `server-only` without the Node execution polyfill.
   - *Fix:* Added `Module._load` polyfill for `server-only` and dynamic imports, matching repository CLI conventions.
   - *Regression Test:* Verified via `npx tsx scripts/test-dashboard.ts`.

---

## 5. Security & Multi-Tenant Findings

1. **Data Isolation**: Multi-tenant database queries strictly scope by `userId` in both `where` clauses and authorization filters. No route or server action allows reading or mutating another user's notes, sessions, or revision records.
2. **Cheat Prevention**: Client question payloads generated by `getQuestionsForPractice` omit `correctOption` and `explanation`.
3. **Double-Spend & Concurrency Protection**: Database unique constraints (`userId_questionId`, `sessionId_questionId`, `userId_conceptKey`, `userId_achievementId`) guarantee idempotency at the database engine level, preventing race condition vulnerabilities.
4. **Credential Security**: CI workflows and unit tests do not require or expose production credentials. Production database credentials reside exclusively in server-side environment variables.

---

## 6. Production Readiness Risks & Recommendations

1. **Clerk Environment Configuration**:
   - *Risk:* In production and preview environments, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` must be configured in Vercel. Local JWT verification executes at 0ms, but email re-linking on returning user accounts requires active Clerk API communication.
   - *Action:* Ensure Clerk webhook and API keys are set in Vercel production environment variables.

2. **Database Connection Pool Sizing**:
   - *Risk:* Crackrr uses `@prisma/adapter-pg` with `pg.Pool`. Serverless functions on Vercel spin up ephemeral instances.
   - *Recommendation:* Ensure `DIRECT_URL` (direct connection) is used for migrations/CLI scripts and pooled connection (`DATABASE_URL` via Supabase/Neon/PgBouncer) is used for runtime traffic to avoid connection exhaustion under high traffic.

3. **WebGL Device Fallback**:
   - *Risk:* The landing page hero uses `components/PlasmaWave/PlasmaWave.tsx` with `ogl`. Low-end devices or browsers with hardware acceleration disabled may fail WebGL context creation.
   - *Recommendation:* Verify graceful fallback to gradient background if WebGL context creation fails.

---

## 7. Release Checklist & Sign-Off

- [x] All uncommitted user work preserved.
- [x] Dedicated branch `test/v1-5-regression-suite` created from latest integration commit.
- [x] ESLint passed with 0 errors and 0 warnings (`npm run lint`).
- [x] TypeScript passed with 0 type errors (`npm run typecheck`).
- [x] Fast unit tests passed in CI (`npm run test:unit`, 70 tests).
- [x] PYQ Ingest validation tests passed (`npm run test:ingest`, 10 tests).
- [x] Database regression tests passed (`npm run test:regression`, 20 tests).
- [x] Integration scripts verified across all features (Weak Concepts, Notes, Smart Revision, Practice, Gamification).
- [x] Next.js production build succeeded (`npm run build`).
- [x] Defects fixed with regression tests committed.
- [x] Test cases documented at `docs/qa/v1-5-test-cases.md`.
- [x] Test results documented at `docs/qa/v1-5-test-results.md`.

**Release Recommendation:** Ready for deployment to staging/preview for final smoke testing prior to production release.
