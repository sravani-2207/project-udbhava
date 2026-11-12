# Udbhava

A calm, premium exchange between students and small teams.

Startups post the real problems they're stuck on. Students take a brief up solo or
with a team, submit phase by phase, and receive structured first-pass feedback.
Startups shortlist, comment, compare side by side, and send real opportunities.

---

## Version 1 scope

This build deliberately stops at the scoped v1:

- **The flow it nails first:** a student submits a solution — and can resubmit it
  as a new version until the deadline.
- **The student's first screen:** the open problems board, ranked against their
  profile.
- **Who it is for:** students and organizations. **No admin dashboard** in v1.
  Admin-only features (verification queues, suspensions, taxonomy, audit logs) are
  intentionally not built.
- A complete organization side exists so submissions have a real reviewer:
  posting briefs, drafts, publishing, closing, phase-level review, shortlisting,
  comments, side-by-side comparison, offers, and basic analytics.

## Stack

- React 19, Vite, TypeScript (strict), Tailwind CSS v4, shadcn/ui (Radix),
  React Router, Framer Motion, Recharts, Lucide.
- React Hook Form + Zod for the submission, profile, and problem forms; Zod also
  validates onboarding and opportunity messages.
- **Convex** for the backend, database, auth, and file storage.

### Note on the requested Express/Postgres stack

This project runs on the Freebuff browser runtime, whose managed backend is
Convex. The server layer therefore lives in `src/convex` instead of a separate
Express process. The requested guarantees are preserved in that layer:

- every function validates its inputs and re-checks the caller's role server-side
  (`src/convex/lib/authz.ts`);
- auth sessions are issued by Convex Auth (email OTP, no passwords, secure
  httpOnly session handling) rather than a hand-rolled JWT + bcrypt pair;
- uploads use Convex file storage instead of Multer;
- the 50-solution cap is enforced inside one serializable Convex mutation, which
  gives the same atomic check-and-increment guarantee as a Postgres transaction
  with `SELECT … FOR UPDATE`;
- no secrets are committed. Configuration lives in `.env.example` and the Convex
  deployment environment.

There is **no external AI API or model anywhere in this project**. See
[AI feedback](#ai-feedback).

## Run it locally

Prerequisites: Bun and a Convex project.

```bash
bun install
```

Set up `.env.example` values in `.env.local` (or use the values already injected
by the runtime):

```env
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_DEPLOYMENT=<your-deployment-name>
CONVEX_SITE_URL=http://localhost:5173
```

Start the backend and generate types:

```bash
bunx convex dev
```

In a second terminal, seed the demo data and start the app:

```bash
bunx convex run seed:run
bun run dev
```

The seed is idempotent, so `bun run seed` (alias) is safe to run repeatedly.

### Demo access (no email required)

On `/auth`, use **Student demo** or **Startup demo**. Each creates an isolated
demo workspace on an anonymous session:

- **Student demo** — a filled profile, one live assignment on a multi-phase brief,
  a submitted version with feedback, an offer, and notifications.
- **Startup demo** — a company profile, two owned briefs, five student
  submissions with analyses, a shortlist, a reviewer note, and a sent offer.

Email sign-up/sign-in uses a six-digit code, asks for the **role first**, then
collects role-specific onboarding details. The role is fixed at onboarding.

## Seeded data

`bunx convex run seed:run` creates, idempotently:

- 4 startups: Kettle & Co., Neelam Health, Tenfold Studio, Loopwise.
- 4 student profiles with different skills and domains.
- 6 problems, including multi-phase briefs, a single-phase brief, and one
  closed-at-cap example that displays **Submissions full**.
- Versioned sample submissions with AI analyses, shortlists, a reviewer comment,
  and opportunities.
- Notifications for feedback, shortlists, and offers.

Admin accounts are excluded because admin is out of v1 scope.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | public | Landing page |
| `/auth` | public | Role-first sign-up, sign-in, demo access |
| `/dashboard` | signed in | Redirects to the account's own workspace |
| `/student` | student | Open problems board |
| `/student/problems/:id` | student | Brief, phases, criteria, take-up flow |
| `/student/work` | student | Active briefs, version progress, offers |
| `/student/work/:assignmentId` | assigned student / team | Submission workspace and feedback |
| `/student/profile` | student | Editable profile and showcase |
| `/org` | organization | Overview, analytics, review queue |
| `/org/problems` | organization | Draft / live / closed briefs |
| `/org/problems/new` | organization | Create a brief with phases |
| `/org/problems/:id` | owning organization | Review, shortlist, comment, compare, offer |
| `/org/opportunities` | organization | Sent offers and their statuses |
| `/org/profile` | organization | Company profile |

Both app sections are protected by `RequireAuth` + `RequireRole` on the client,
and every Convex query/mutation re-checks the signed-in user and ownership on the
server. Signed-out visitors are sent to `/auth?returnTo=…` and returned to the page
they asked for.

## Business rules

- **50-solution cap.** `assignments.takeUp` reads the problem, rejects a full or
  closed problem, increments `solutionCount`, and auto-closes at the cap in one
  serializable mutation. The board and detail page show a live
  `taken / 50` meter and the full state reads **Submissions full**. Concurrent
  take-ups cannot overfill the cap.
- **Phases.** Every problem has at least one phase. With multiple phases, a student
  must choose one at take-up; the choice is stored on the assignment and the
  backend refuses submissions for any other phase.
- **Solo/team is captured once.** `assignment.mode` is recorded at take-up. There
  is no mutation to change it. Teams have up to five members, one lead, and only
  the lead submits; the lead can be reassigned explicitly.
- **Versioned submissions.** A new submission becomes `vN+1` for that
  assignment/phase. Nothing is overwritten. Earlier versions and their feedback stay
  readable, and resubmission works until the deadline.
- **Deadline & closure.** Submissions stop when the org closes the brief, the
  deadline passes, or the cap is reached. The workspace turns read-only and says
  why.
- **Notifications** are created for team invites, new submissions, feedback ready,
  reviewer comments, shortlists, and offers.

## AI feedback

The feedback is generated by one isolated, deterministic stub:

**`src/convex/services/aiAnalysis.ts`**

It returns the final structured shape already used by the UI:

```ts
{
  alignmentScore: number;          // 0–100
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];       // actionable upgrades
  criteriaCoverage: { criterion: string; covered: boolean }[];
  model: string;
}
```

The module is clearly commented with the migration path: turn it into a Convex
`"use node"` action, keep the result shape, persist it to `aiAnalyses`, and no UI
change is required. The UI labels this as a structured first pass, not a verdict.

## Data model

Defined and indexed in `src/convex/schema.ts`:

`users` (roles: student, organization, admin) · `studentProfiles` ·
`organizationProfiles` · `problems` · `phases` · `teams` · `teamMembers` ·
`assignments` · `submissions` · `aiAnalyses` · `shortlists` · `reviews` ·
`opportunities` · `notifications`.

Indexes cover every access path used by the queries: problems by owner/state/
deadline, phases and submissions by problem, assignments by student and problem,
team membership by problem and user, analyses and reviews by submission,
notifications by user and read state.

## Design

- Palette applied only through theme tokens in `src/index.css`:
  Muted Sage Grey `#A5A79B` in surfaces and hairlines, Warm Cream Beige
  `#E8D2B5` in backgrounds and soft panels, Deep Burgundy `#590907` in primary
  actions, headings, and active states.
- Cormorant Garamond for display serif and a widely tracked `UDBHAVA` wordmark;
  Instrument Sans for UI. The lotus mark is a clean inline SVG in
  `src/components/brand.tsx`.
- Loading skeletons (`src/components/shared/state-views.tsx`), explicit empty
  states, and a page-level error boundary are used across the app.
- Responsive from mobile upward; the dashboard uses a real sidebar with a mobile
  sheet, and all dialogs constrain their height and scroll internally.

## Scripts

```bash
bun run dev          # Vite frontend
bun run seed         # bunx convex run seed:run
bun run lint         # ESLint
bun tsc -b --noEmit  # Typecheck
bunx convex dev --once   # Deploy functions + refresh generated types
```

## Verification

```bash
bunx convex dev --once && bun tsc -b --noEmit
```

Both commands must exit 0. The project currently has no dedicated automated test
suite; v1 was verified through the typecheck, Convex function deploy, and the
seeded end-to-end paths described above.
