# Smart Revision (v1.5)

## Overview

Smart Revision is a core JEE preparation workflow in Crackrr that helps students methodically revisit material they have struggled with. It combines **Weak Concept Analysis diagnostics**, **missed practice questions**, **personal revision notes**, and a **deterministic spaced-repetition scheduling engine**.

The feature introduces a dedicated Smart Revision dashboard (`/revision`), an explainable prioritisation queue, and a focused concept-level review workflow.

---

## 1. Architecture & Integration Points

Smart Revision builds directly on existing platform systems:

```
┌────────────────────────────────┐       ┌───────────────────────────────┐
│     Weak Concept Analysis      │       │     Practice History (PYQ)    │
│  (Taxonomy, Pacing, Errors)    │       │     QuizSession / QuizAnswer  │
└───────────────┬────────────────┘       └───────────────┬───────────────┘
                │                                        │
                └───────────────────┬────────────────────┘
                                    ▼
                     ┌─────────────────────────────┐
                     │  Smart Revision Queue Engine│
                     │  (lib/server/revision/queue)│
                     └──────────────┬──────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌───────────────────────────┐                       ┌───────────────────┐
│   Smart Revision Notes    │                       │  RevisionRecord   │
│ (Visual Worked Steps,     │                       │ (Spaced Schedule, │
│  Formulas & Annotations)  │                       │  Cycles & Status) │
└───────────────────────────┘                       └───────────────────┘
```

1. **Weak Concept Analysis (`lib/server/concepts/...`)**: Supplies canonical concept taxonomy (`SUBJECT::Chapter::Topic`), accuracy percentages, attempt counts, pacing friction tags (`TIME_TRAP`, `CARELESS_RUSH`), and root-cause weakness levels (`CRITICAL_WEAKNESS`, `NEEDS_ATTENTION`).
2. **Practice History (`lib/server/practice/...`)**: Supplies historical question attempts, incorrect answers, and time taken per question.
3. **Smart Revision Notes (`lib/server/notes/...`)**: Supplies user-saved bookmarks, visual step-by-step worked solutions, and key takeaways.
4. **User Security & Authentication (`lib/server/auth/...`)**: Enforces multi-tenant isolation on all review operations and data queries.

---

## 2. Database Model

The database introduces the `RevisionRecord` model in `prisma/schema.prisma` with an accompanying non-destructive migration (`prisma/migrations/20261026213000_add_revision_records/`):

```prisma
enum RevisionStatus {
  NOT_REVIEWED
  REVIEWED
  NEEDS_PRACTICE
}

model RevisionRecord {
  id             String         @id @default(cuid())
  userId         String
  user           UserProfile    @relation(fields: [userId], references: [id], onDelete: Cascade)
  conceptKey     String         @db.VarChar(500)
  subject        QuestionSubject
  chapter        String         @db.VarChar(255)
  topic          String?        @db.VarChar(255)
  status         RevisionStatus @default(NOT_REVIEWED)
  reviewCount    Int            @default(0)
  lastReviewedAt DateTime?
  nextReviewDue  DateTime?
  lastFeedback   String?        @db.VarChar(50)
  notes          String?        @db.Text
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@unique([userId, conceptKey])
  @@index([userId])
  @@index([userId, status])
  @@index([userId, nextReviewDue])
  @@index([userId, conceptKey])
  @@index([userId, subject])
}
```

### Key Schema Characteristics
- **Bounded Row Count**: Groups tracking at the canonical concept level (`conceptKey`), preventing unconstrained row growth while maintaining cross-referencing capabilities.
- **Idempotency**: The `@@unique([userId, conceptKey])` composite constraint guarantees that each student has exactly one revision state record per concept.
- **Indexed Lookups**: Compound indexes on `(userId, status)` and `(userId, nextReviewDue)` ensure sub-millisecond queue filtering and due-date evaluations.

---

## 3. Prioritisation Engine

The prioritisation engine (`lib/server/revision/prioritization.ts`) calculates an explainable score between 0 and 100 for each candidate concept:

### A. Scoring Components

| Factor | Condition | Score Weight |
|---|---|---|
| **Weakness Level** | `CRITICAL_WEAKNESS` (< 45% accuracy) | +45 points |
| | `NEEDS_ATTENTION` (45–60% accuracy) | +30 points |
| | `DEVELOPING` (60–75% accuracy) | +15 points |
| | `UNCLASSIFIED` with errors | +20 points |
| **Error Frequency** | $\ge 4$ missed attempts | +20 points |
| | 2–3 missed attempts | +12 points |
| | 1 missed attempt | +6 points |
| **Diagnostic Tags** | `CONCEPT_GAP` (fundamental error) | +10 points |
| | `TIME_TRAP` (> 110s average time) | +5 points |
| | `CARELESS_RUSH` (< 15s incorrect) | +5 points |
| **Performance Trend** | `DECLINING` ($\le -15\%$ recency shift) | +10 points |
| | `IMPROVING` ($\ge +15\%$ recency shift) | -10 points |
| **Review Schedule** | `NEEDS_PRACTICE` status | +25 points |
| | `NOT_REVIEWED` status | +15 points |
| | `REVIEWED` and `nextReviewDue <= now` | +25 points |
| | `REVIEWED` recently (< 24h ago) | -30 points (cooling period) |
| **User Notes** | Saved reference notes for concept | +5 points |

### B. Priority Tiers

- **`CRITICAL` (Score $\ge 70$)**: High error rate, critical conceptual gaps, or declining trend.
- **`HIGH` (Score $50 - 69$)**: Concepts needing reinforcement or scheduled review intervals overdue.
- **`MEDIUM` (Score $30 - 49$)**: Developing concepts or single-miss practice items.
- **`SCHEDULED_REVIEW` (Score $< 30$)**: Mastered or recently reviewed concepts awaiting future spaced checkups.

### C. Explainable Reasons
Every item in the queue surfaces clear, human-readable explanations of why it was prioritized (e.g., *"Critical weakness identified (33% accuracy across 6 attempts)"*, *"3 questions answered incorrectly in recent practice"*).

---

## 4. Spaced Repetition Scheduling

The scheduling engine (`lib/server/revision/scheduling.ts`) provides deterministic review intervals based on student feedback and revision history:

| Review Outcome | Prior Review Count | Scheduled Interval |
|---|---|---|
| `NEEDS_PRACTICE` | Any | **+1 day** (immediate reinforcement) |
| `REVIEWED` | 0 or 1 | **+3 days** (initial retention check) |
| `REVIEWED` | 2 | **+7 days** (medium-term recall) |
| `REVIEWED` | 3 | **+14 days** (consolidated retention) |
| `REVIEWED` | $\ge 4$ | **+30 days** (long-term maintenance) |
| `NOT_REVIEWED` | 0 | **Immediate** (due upon discovery) |

> **Important**: Marking an item as reviewed updates retention scheduling only; it never falsely marks the student as having mastered the concept in Weak Concept Analysis. Mastery is exclusively earned through verified correct practice attempts.

---

## 5. Review Workflow

A student completes revision through the following workflow:

1. **Dashboard Entry (`/revision`)**: Displays current revision queue, items due for review, active revision streak, and subject breakdown.
2. **Start Revising Action**: Opens the highest-priority due concept immediately.
3. **Concept Modal (`RevisionDetailModal.tsx`)**:
   - **Core Theory & Visual Explanations**: Surfaces key formulas, core theorems, and step-by-step visual solutions.
   - **Missed Practice Questions**: Displays the student's historical errors, showing their selected option vs. correct option, time taken, and step-by-step worked explanations.
   - **Personal Notes**: Displays user-created notes and takeaways.
   - **Targeted Practice**: Provides a 1-click launcher to drill 5–10 new questions on the concept.
4. **Recording Feedback**:
   - Optional student reflection note.
   - One-click **"Mark as Reviewed"** (schedules +3 to +7 days).
   - One-click **"Needs More Practice"** (schedules +1 day).
5. **Instant Progress Update**: Optimistically updates queue status and progress counts, with server-side validation and throttled double-click protection (5-second idempotency window).

---

## 6. Verification and Testing

Run the automated verification suite:

```bash
npx tsx scripts/test-smart-revision.ts
```

The suite covers:
1. Deterministic spaced repetition intervals and due-date calculations.
2. Prioritisation scoring, tier classification, and explainable rules.
3. Clean zero-state behavior (no fabricated data when history is empty).
4. Practice attempt integration and queue population.
5. Review recording, state transitions, and idempotency against rapid duplicate clicks.
6. Progress metrics and active review streak tracking.
7. Detail context loading with missed questions and saved notes.
8. Multi-tenant isolation and user ownership enforcement.
9. Resilience against missing notes, deleted questions, or empty taxonomies.

Standard quality gates:
```bash
npm run lint
npm run typecheck
npm run test:ingest
npm run build
```
