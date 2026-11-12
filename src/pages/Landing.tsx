import { BrandLink, LotusMark, Monogram } from "@/components/brand";
import { DifficultyBadge, SlotsMeter } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatDeadline } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Compass,
  Layers,
  Quote,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={fadeUp.initial}
      whileInView={fadeUp.whileInView}
      viewport={fadeUp.viewport}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

const steps = [
  {
    number: "01",
    title: "Startups post the real thing",
    body: "Not a case-study fiction. A live brief from a small team — with context, constraints, a phase plan, and a deadline.",
    icon: Layers,
  },
  {
    number: "02",
    title: "Students choose how to work",
    body: "Take it up solo or build a team around it. On multi-phase briefs, pick the phase that matches what you're good at.",
    icon: Users,
  },
  {
    number: "03",
    title: "Submit, get honest feedback",
    body: "Write the approach, attach a repo or prototype, and submit per phase. Structured feedback arrives against the brief's own criteria.",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "Good work becomes a start",
    body: "Startups shortlist, compare side by side, and send real opportunities: an internship, a project, or a first job.",
    icon: Trophy,
  },
];

const studentPoints = [
  "Briefs ranked against your skills, interests, and domain.",
  "One clear choice at take-up: solo or team, captured honestly.",
  "Per-phase submissions with a real version history.",
  "Structured feedback: strengths, gaps, and the next upgrade.",
];

const startupPoints = [
  "Post a challenge in minutes, publish when it's ready.",
  "Up to 50 solutions, capped and counted transparently.",
  "Phase-level review with AI feedback summaries.",
  "Shortlist, comment, compare, then send an offer.",
];

const companies = ["Kettle & Co.", "Neelam Health", "Tenfold Studio", "Loopwise"];

const testimonials = [
  {
    quote:
      "The brief was messy on purpose. Reading four different approaches to it told us more about our own product than a month of internal debate.",
    name: "Priya Raghavan",
    role: "Founder, Kettle & Co.",
    initials: "PR",
  },
  {
    quote:
      "I picked one phase I actually understood, submitted twice, and the second version got shortlisted. That feedback loop is the whole point.",
    name: "Meera Nair",
    role: "Design student, NID Ahmedabad",
    initials: "MN",
  },
  {
    quote:
      "Fifty slots is enough to see the spread of thinking, and few enough that every submission still gets read. That balance is unusual.",
    name: "Dr. Aditya Menon",
    role: "Co-founder, Neelam Health",
    initials: "AM",
  },
];

export default function Landing() {
  const featured = useQuery(api.problems.featured);
  const stats = useQuery(api.problems.publicStats);
  const { isAuthenticated, user } = useAuth();

  const heroProblem = featured?.[0] ?? null;
  const dashboardPath = user?.role === "organization" ? "/org" : "/student";
  const joinTarget = isAuthenticated ? dashboardPath : "/auth?role=student";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <BrandLink />
          <nav className="hidden items-center gap-7 text-sm text-foreground/75 lg:flex" aria-label="Landing">
            <a href="#how-it-works" className="transition-colors hover:text-primary">
              How it works
            </a>
            <a href="#students" className="transition-colors hover:text-primary">
              For students
            </a>
            <a href="#startups" className="transition-colors hover:text-primary">
              For startups
            </a>
            <a href="#briefs" className="transition-colors hover:text-primary">
              Live briefs
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm" className="gap-1.5">
                <Link to={dashboardPath}>
                  Dashboard
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/auth?mode=signin">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="gap-1.5">
                  <Link to="/auth?role=student">
                    Join Udbhava
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="paper-wash relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-10 hidden h-[30rem] w-[30rem] rounded-full border border-border/40 lg:block"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-16 top-24 hidden lg:block"
          >
            <LotusMark className="h-64 w-auto text-primary/[0.055]" strokeWidth={0.7} />
          </div>

          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:pb-28">
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3"
              >
                <span className="h-px w-8 bg-primary/40" />
                <Eyebrow className="text-primary/80">
                  For students · For small teams
                </Eyebrow>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.06 }}
                className="mt-6 font-display text-[3.15rem] font-semibold leading-[0.96] tracking-[-0.025em] text-foreground sm:text-[4.2rem] lg:text-[4.6rem]"
              >
                Real problems.
                <br />
                Real work.
                <br />
                <em className="font-medium italic text-primary">Real beginnings.</em>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.14 }}
                className="mt-7 max-w-xl text-[0.98rem] leading-7 text-muted-foreground sm:text-[1.05rem]"
              >
                Udbhava is where startups put their actual problems on the table
                and students answer with real work. Take a brief on your own or
                with a team, submit phase by phase, and turn a good solution into
                an internship, a project, or a first job.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <Button asChild size="lg" className="h-11 gap-2 rounded-lg px-5">
                  <Link to={joinTarget}>
                    Browse open problems
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 gap-2 rounded-lg border-border bg-card/70 px-5"
                >
                  <Link to={isAuthenticated ? "/org/problems/new" : "/auth?role=organization"}>
                    Post a problem
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" strokeWidth={2.4} />
                  Free for students
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" strokeWidth={2.4} />
                  50-solution cap, counted openly
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" strokeWidth={2.4} />
                  Built for teams of 1–50
                </span>
              </motion.div>

              <div className="mt-10 flex flex-wrap items-center gap-8 border-t border-border/70 pt-6">
                <div>
                  <p className="font-display text-2xl font-semibold text-foreground">
                    {stats?.openProblems ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Live briefs
                  </p>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold text-foreground">
                    {stats?.startups ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Small teams
                  </p>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold text-foreground">
                    {stats?.students ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Students building
                  </p>
                </div>
              </div>
            </div>

            {/* Layered product visual */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-0 mx-auto w-full max-w-[26rem] lg:max-w-none"
            >
              <div
                aria-hidden="true"
                className="absolute -left-3 top-7 hidden h-[92%] w-[94%] -rotate-[3.2deg] rounded-[1.6rem] border border-border/80 bg-accent/35 sm:block"
              />
              <div className="relative rounded-[1.6rem] border border-border/80 bg-card p-6 soft-card sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Monogram name={heroProblem?.orgName ?? "Neelam Health"} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {heroProblem?.orgName ?? "Neelam Health"}
                      </p>
                      <p className="text-[0.7rem] text-muted-foreground">
                        {heroProblem?.orgVerified ?? true ? "Verified startup" : "Startup"}
                        <span className="mx-1.5">·</span>
                        {heroProblem?.domain ?? "Product & Service Design"}
                      </p>
                    </div>
                  </div>
                  <DifficultyBadge value={heroProblem?.difficulty ?? "advanced"} />
                </div>

                <h2 className="mt-6 font-display text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.01em]">
                  {heroProblem?.title ?? "Reduce no-shows for rural telehealth consultations"}
                </h2>
                <p className="mt-3 line-clamp-3 text-[0.82rem] leading-6 text-muted-foreground">
                  {heroProblem?.summary ??
                    "One in three booked consultations never happens. Find out why and prototype an intervention that works for ASHA workers and families."}
                </p>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {(heroProblem?.skills ?? ["User Research", "Behavioural Design", "WhatsApp"])
                    .slice(0, 4)
                    .map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-[0.68rem] text-foreground/75"
                      >
                        {skill}
                      </span>
                    ))}
                </div>

                <div className="mt-6 border-t border-border/60 pt-4">
                  <SlotsMeter
                    count={heroProblem?.solutionCount ?? 31}
                    cap={heroProblem?.solutionCap ?? 50}
                  />
                  <div className="mt-3 flex items-center justify-between text-[0.7rem] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="size-3.5" />
                      {heroProblem?.phaseCount ?? 2} phases
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {heroProblem
                        ? formatDeadline(heroProblem.deadline)
                        : "Closes in 26 days"}
                    </span>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="absolute -bottom-8 -left-2 w-[15.5rem] rounded-2xl border border-border/80 bg-card p-4 soft-card sm:-left-8"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Feedback ready
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[0.62rem] font-medium text-secondary-foreground">
                    <Sparkles className="size-3" />
                    v2
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full border border-primary/15 bg-accent/30 font-display text-lg font-semibold text-primary">
                    82
                  </span>
                  <div>
                    <p className="text-xs font-medium">Promising alignment</p>
                    <p className="text-[0.68rem] text-muted-foreground">
                      3 strengths · 2 upgrades
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.65 }}
                className="absolute -right-1 -top-5 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-[0.68rem] font-medium text-foreground shadow-sm sm:-right-5"
              >
                <Trophy className="size-3.5 text-primary" />
                Shortlisted
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Company strip */}
        <section className="border-y border-border/70 bg-card/45">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-[20rem] text-xs leading-5 text-muted-foreground">
              Built for the companies you haven't heard of yet — and the students
              who will make them known.
            </p>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
              {companies.map((company) => (
                <span
                  key={company}
                  className="inline-flex items-center gap-2 text-sm font-medium text-foreground/55"
                >
                  <Monogram name={company} className="size-7 rounded-lg text-[0.6rem]" />
                  {company}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 bg-background">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <Reveal className="max-w-xl">
                <Eyebrow>How it works</Eyebrow>
                <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.04] tracking-[-0.02em] sm:text-[3.1rem]">
                  A short loop between
                  <br />
                  <em className="italic text-primary">a problem and a person.</em>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  No endless applications. No invented case studies. Four steps,
                  one clear exchange of real work for real opportunity.
                </p>
              </Reveal>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <Reveal key={step.number} delay={index * 0.06}>
                  <div className="flex h-full flex-col bg-card p-6 sm:p-7">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-semibold text-primary">
                        {step.number}
                      </span>
                      <step.icon className="size-5 text-primary/60" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-8 font-display text-[1.4rem] font-semibold leading-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-[0.82rem] leading-6 text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Two audiences */}
        <section className="border-y border-border/60 bg-secondary/25">
          <div className="mx-auto grid w-full max-w-6xl gap-px overflow-hidden px-0 md:grid-cols-2">
            <div id="students" className="scroll-mt-24 bg-background px-6 py-16 sm:px-10 sm:py-20">
              <Reveal>
                <Eyebrow>For students</Eyebrow>
                <h2 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-[2.9rem]">
                  Build a body of work,
                  <br />
                  <em className="italic text-primary">not a folder of mockups.</em>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  Start on the open problems board. Your feed is ranked by your
                  skills and interests, so the first brief you see is one you can
                  actually contribute to.
                </p>

                <ul className="mt-8 space-y-4">
                  {studentPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/40 text-primary">
                        <Check className="size-3" strokeWidth={2.6} />
                      </span>
                      <span className="text-sm leading-6 text-foreground/80">{point}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-9">
                  <Button asChild className="gap-2">
                    <Link to={isAuthenticated ? dashboardPath : "/auth?role=student"}>
                      Find your first brief
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </Reveal>
            </div>

            <div id="startups" className="scroll-mt-24 bg-card px-6 py-16 sm:px-10 sm:py-20">
              <Reveal delay={0.08}>
                <Eyebrow>For startups</Eyebrow>
                <h2 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-[2.9rem]">
                  See how people think
                  <br />
                  <em className="italic text-primary">before you hire.</em>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  Post the problem your team keeps postponing. Get up to fifty
                  solutions, review them phase by phase, and shortlist the people
                  whose thinking fits how you work.
                </p>

                <ul className="mt-8 space-y-4">
                  {startupPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/40 text-primary">
                        <Check className="size-3" strokeWidth={2.6} />
                      </span>
                      <span className="text-sm leading-6 text-foreground/80">{point}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-9">
                  <Button asChild variant="outline" className="gap-2 border-primary/20 bg-background">
                    <Link to={isAuthenticated ? "/org/problems/new" : "/auth?role=organization"}>
                      Post a problem
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Featured live briefs */}
        <section id="briefs" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <Reveal>
                <Eyebrow>Live on Udbhava</Eyebrow>
                <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.02em] sm:text-[3rem]">
                  Open briefs, closing soon.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <Button asChild variant="ghost" className="gap-2 px-0 text-primary hover:bg-transparent hover:text-primary/80">
                  <Link to={isAuthenticated ? dashboardPath : "/auth?role=student"}>
                    View the full board
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Reveal>
            </div>

            {featured === undefined ? (
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-border/70 bg-card p-6"
                  >
                    <div className="skeleton-warm h-10 w-10 rounded-xl" />
                    <div className="skeleton-warm mt-5 h-5 w-4/5 rounded-md" />
                    <div className="skeleton-warm mt-2 h-5 w-3/5 rounded-md" />
                    <div className="skeleton-warm mt-5 h-3 w-full rounded-full" />
                    <div className="skeleton-warm mt-2 h-3 w-2/3 rounded-full" />
                    <div className="skeleton-warm mt-6 h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : featured.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
                <Compass className="mx-auto size-6 text-primary/60" strokeWidth={1.6} />
                <p className="mt-4 font-display text-2xl font-semibold">
                  The next brief could be yours
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  New problems are posted by small teams every week. Join as a
                  student or bring the first problem yourself.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/auth?role=student">Join as a student</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/auth?role=organization">Join as a startup</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {featured.map((problem, index) => (
                  <Reveal key={problem._id} delay={index * 0.07}>
                    <Link
                      to={isAuthenticated ? `/student/problems/${problem._id}` : "/auth?role=student"}
                      className="lift group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Monogram name={problem.orgName} className="size-9 rounded-lg" />
                          <div>
                            <p className="text-[0.8rem] font-semibold leading-tight">
                              {problem.orgName}
                            </p>
                            <p className="mt-0.5 text-[0.66rem] text-muted-foreground">
                              {problem.domain}
                            </p>
                          </div>
                        </div>
                        <DifficultyBadge value={problem.difficulty} />
                      </div>

                      <h3 className="mt-5 font-display text-[1.4rem] font-semibold leading-[1.16] transition-colors group-hover:text-primary">
                        {problem.title}
                      </h3>
                      <p className="mt-2.5 line-clamp-3 text-[0.82rem] leading-6 text-muted-foreground">
                        {problem.summary}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {problem.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-border/80 bg-background px-2 py-0.5 text-[0.66rem] text-foreground/70"
                          >
                            {skill}
                          </span>
                        ))}
                        {problem.skills.length > 3 ? (
                          <span className="px-1 py-0.5 text-[0.66rem] text-muted-foreground">
                            +{problem.skills.length - 3}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-auto pt-6">
                        <SlotsMeter count={problem.solutionCount} cap={problem.solutionCap} compact />
                        <div className="mt-3 flex items-center justify-between text-[0.7rem] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Layers className="size-3.5" />
                            {problem.phaseCount === 1
                              ? "Single phase"
                              : `${problem.phaseCount} phases`}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-3.5" />
                            {formatDeadline(problem.deadline)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-y border-border/60 bg-card/50">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <Reveal className="max-w-xl">
              <Eyebrow>What it feels like</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.02em] sm:text-[3rem]">
                Small teams. Serious students.
                <br />
                <em className="italic text-primary">A fair exchange.</em>
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <Reveal key={testimonial.name} delay={index * 0.07}>
                  <figure className="flex h-full flex-col rounded-2xl border border-border/70 bg-background p-6 sm:p-7">
                    <Quote className="size-5 text-primary/35" strokeWidth={1.5} />
                    <blockquote className="mt-4 flex-1 font-display text-[1.2rem] leading-[1.45] text-foreground/90">
                      “{testimonial.quote}”
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                      <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-[0.65rem] font-semibold text-primary">
                        {testimonial.initials}
                      </span>
                      <div>
                        <p className="text-xs font-semibold">{testimonial.name}</p>
                        <p className="text-[0.68rem] text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-[1.8rem] bg-primary px-7 py-14 text-primary-foreground sm:px-14 sm:py-16">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-16 opacity-[0.13]"
              >
                <LotusMark className="h-80 w-auto text-primary-foreground" strokeWidth={0.7} />
              </div>
              <div className="relative max-w-2xl">
                <Eyebrow className="text-primary-foreground/65">
                  One problem is enough to begin
                </Eyebrow>
                <h2 className="mt-4 font-display text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.02em] sm:text-[3.5rem]">
                  The next thing you build
                  <br />
                  <em className="italic text-primary-foreground/85">
                    could start with someone else's problem.
                  </em>
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-6 text-primary-foreground/75">
                  Join as a student to find a brief that fits, or bring your
                  startup's real challenge and see how a generation of students
                  approaches it.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 gap-2 bg-background text-primary hover:bg-background/90"
                  >
                    <Link to={isAuthenticated ? dashboardPath : "/auth?role=student"}>
                      Start as a student
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-11 gap-2 border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  >
                    <Link
                      to={
                        isAuthenticated
                          ? "/org/problems/new"
                          : "/auth?role=organization"
                      }
                    >
                      Post a problem
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandLink />
            <p className="mt-4 max-w-xs text-xs leading-6 text-muted-foreground">
              A calm place for students and small companies to do serious work
              together. Built around real problems, honest constraints, and
              useful feedback.
            </p>
          </div>
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-xs text-foreground/70">
              <li><a href="#how-it-works" className="hover:text-primary">How it works</a></li>
              <li><a href="#briefs" className="hover:text-primary">Open problems</a></li>
              <li><Link to="/auth?role=organization" className="hover:text-primary">Post a brief</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Students
            </p>
            <ul className="mt-3 space-y-2 text-xs text-foreground/70">
              <li><Link to="/auth?role=student" className="hover:text-primary">Join as a student</Link></li>
              <li><a href="#students" className="hover:text-primary">Why Udbhava</a></li>
              <li><Link to="/auth?mode=signin" className="hover:text-primary">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Startups
            </p>
            <ul className="mt-3 space-y-2 text-xs text-foreground/70">
              <li><Link to="/auth?role=organization" className="hover:text-primary">Join as a startup</Link></li>
              <li><a href="#startups" className="hover:text-primary">How review works</a></li>
              <li><a href="#how-it-works" className="hover:text-primary">The 50-solution cap</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 text-[0.68rem] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>© {new Date().getFullYear()} Udbhava. Made for the ones building quietly.</p>
            <p className="inline-flex items-center gap-1.5">
              <LotusMark className="h-3.5 w-auto text-primary/60" />
              A student–startup exchange, with care.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
