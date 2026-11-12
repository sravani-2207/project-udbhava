import { Monogram } from "@/components/brand";
import { CardGridSkeleton, EmptyState } from "@/components/shared/state-views";
import {
  DeadlineText,
  DifficultyBadge,
  Eyebrow,
  MatchChip,
  MetaItem,
  PageHeading,
  PhaseCount,
  SlotsMeter,
} from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { firstName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";

type Difficulty = "starter" | "intermediate" | "advanced";
type SortOption = "recommended" | "deadline" | "newest";

const sortLabels: Record<SortOption, string> = {
  recommended: "Recommended first",
  deadline: "Closing soonest",
  newest: "Newest first",
};

export default function StudentBoard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [domain, setDomain] = useState("all");
  const [skill, setSkill] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [deadlineWithin, setDeadlineWithin] = useState("any");
  const [sort, setSort] = useState<SortOption>("recommended");

  const facets = useQuery(api.problems.facets);

  const args = useMemo(
    () => ({
      search: deferredSearch.trim() ? deferredSearch.trim() : undefined,
      domain: domain === "all" ? undefined : domain,
      skill: skill === "all" ? undefined : skill,
      difficulty:
        difficulty === "all" ? undefined : (difficulty as Difficulty),
      deadlineWithinDays:
        deadlineWithin === "any" ? undefined : Number(deadlineWithin),
      sort,
    }),
    [deferredSearch, domain, skill, difficulty, deadlineWithin, sort],
  );

  const board = useQuery(api.problems.board, args);

  const activeFilters =
    (domain !== "all" ? 1 : 0) +
    (skill !== "all" ? 1 : 0) +
    (difficulty !== "all" ? 1 : 0) +
    (deadlineWithin !== "any" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setDomain("all");
    setSkill("all");
    setDifficulty("all");
    setDeadlineWithin("any");
    setSort("recommended");
  }

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Discover"
        title={
          <>
            Open problems,
            <br className="sm:hidden" /> ready for you.
          </>
        }
        description={
          <>
            {firstName(user?.name)}, these are live briefs from startups that
            need a fresh pair of eyes. Ranked against your skills — but every
            open problem is yours to explore.
          </>
        }
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[0.7rem] text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-primary" strokeWidth={1.9} />
            Up to 50 solutions per problem
          </div>
        }
      />

      {board?.profileReady === false ? (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-accent/20 px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-foreground/80">
            Finish your profile to rank briefs against your skills and interests.
          </p>
          <Button asChild variant="outline" size="sm" className="h-8 bg-card">
            <Link to="/student/profile">Complete profile</Link>
          </Button>
        </div>
      ) : null}

      {/* Search + filters */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by challenge, company, skill, or domain…"
              aria-label="Search open problems"
              className="h-10 border-border/80 bg-background/60 pl-9 pr-9 shadow-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            Filters
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger
                className="h-9 w-full min-w-0 border-border/80 bg-background/60 text-xs lg:w-[9.5rem]"
                aria-label="Filter by domain"
              >
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {(facets?.domains ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger
                className="h-9 w-full min-w-0 border-border/80 bg-background/60 text-xs lg:w-[9rem]"
                aria-label="Filter by skill"
              >
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All skills</SelectItem>
                {(facets?.skills ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger
                className="h-9 w-full min-w-0 border-border/80 bg-background/60 text-xs lg:w-[8.75rem]"
                aria-label="Filter by difficulty"
              >
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any level</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deadlineWithin} onValueChange={setDeadlineWithin}>
              <SelectTrigger
                className="h-9 w-full min-w-0 border-border/80 bg-background/60 text-xs lg:w-[8.5rem]"
                aria-label="Filter by deadline"
              >
                <SelectValue placeholder="Deadline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any deadline</SelectItem>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
              <SelectTrigger
                className="col-span-2 h-9 w-full min-w-0 border-border/80 bg-background/60 text-xs sm:col-span-1 lg:w-[11rem]"
                aria-label="Sort problems"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {sortLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilters > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="col-span-2 h-9 gap-1.5 text-xs text-muted-foreground hover:text-primary sm:col-span-1"
              >
                <X className="size-3.5" />
                Clear {activeFilters}
              </Button>
            ) : null}
          </div>
        </div>

        {activeFilters > 0 && (facets?.domains.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            <span className="mr-1 text-[0.66rem] uppercase tracking-[0.12em] text-muted-foreground">
              Active
            </span>
            {search.trim() ? (
              <FilterChip label={`“${search.trim()}”`} onClear={() => setSearch("")} />
            ) : null}
            {domain !== "all" ? (
              <FilterChip label={domain} onClear={() => setDomain("all")} />
            ) : null}
            {skill !== "all" ? (
              <FilterChip label={skill} onClear={() => setSkill("all")} />
            ) : null}
            {difficulty !== "all" ? (
              <FilterChip
                label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                onClear={() => setDifficulty("all")}
              />
            ) : null}
            {deadlineWithin !== "any" ? (
              <FilterChip
                label={`Next ${deadlineWithin} days`}
                onClear={() => setDeadlineWithin("any")}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Result summary */}
      {board ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {board.items.length} {board.items.length === 1 ? "brief" : "briefs"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{board.totalOpen} still open</span>
            {board.matchingCount > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <Sparkles className="size-3.5" />
                  {board.matchingCount} strong{" "}
                  {board.matchingCount === 1 ? "match" : "matches"}
                </span>
              </>
            ) : null}
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            Sorted by {sortLabels[sort].toLowerCase()}
          </p>
        </div>
      ) : null}

      {board === undefined ? (
        <CardGridSkeleton count={6} />
      ) : board.items.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No briefs match that combination"
          description="Try a wider deadline, a different domain, or clear the search. New problems are posted every week."
          action={
            <Button variant="outline" onClick={resetFilters}>
              Clear all filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {board.items.map((problem, index) => (
            <motion.div
              key={problem._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.28) }}
              className="h-full"
            >
              <Link
                to={`/student/problems/${problem._id}`}
                className={cn(
                  "lift group flex h-full flex-col rounded-2xl border bg-card p-5 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none sm:p-6",
                  problem.isFull
                    ? "border-border/60 bg-card/70"
                    : "border-border/70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Monogram name={problem.orgName} className="size-9 rounded-lg" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[0.8rem] font-semibold leading-tight">
                        <span className="truncate">{problem.orgName}</span>
                        {problem.orgVerified ? (
                          <CheckCircle2
                            className="size-3 shrink-0 text-primary"
                            aria-label="Verified startup"
                          />
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">
                        {problem.domain}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <DifficultyBadge value={problem.difficulty} />
                    {problem.hasTaken ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary-foreground">
                        Taken
                      </span>
                    ) : (
                      <MatchChip score={problem.matchScore} />
                    )}
                  </div>
                </div>

                <h2 className="mt-5 font-display text-[1.45rem] font-semibold leading-[1.15] tracking-[-0.01em] transition-colors group-hover:text-primary">
                  {problem.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-[0.82rem] leading-6 text-muted-foreground">
                  {problem.summary}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {problem.skills.slice(0, 4).map((item) => (
                    <span
                      key={item}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[0.65rem]",
                        problem.matchedSkills.includes(item)
                          ? "border-primary/20 bg-accent/30 text-foreground/85"
                          : "border-border/80 bg-background text-foreground/65",
                      )}
                    >
                      {item}
                    </span>
                  ))}
                  {problem.skills.length > 4 ? (
                    <span className="px-1 py-0.5 text-[0.65rem] text-muted-foreground">
                      +{problem.skills.length - 4}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <PhaseCount count={problem.phaseCount} />
                  <DeadlineText deadline={problem.deadline} />
                </div>

                <div className="mt-auto pt-5">
                  <SlotsMeter
                    count={problem.solutionCount}
                    cap={problem.solutionCap}
                    compact
                  />
                  <div className="mt-3.5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                      <Users className="size-3.5" />
                      Solo or up to 5
                    </span>
                    {problem.isFull ? (
                      <Badge
                        variant="outline"
                        className="border-primary/20 bg-accent/25 text-primary"
                      >
                        Submissions full
                      </Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-primary">
                        {problem.hasTaken ? "Continue your work" : "View brief"}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Compass className="size-4" />
          </span>
          <div>
            <p className="text-xs font-medium">Not sure where to start?</p>
            <p className="mt-0.5 text-[0.72rem] text-muted-foreground">
              Open any brief and read the phase criteria before committing. You
              only choose solo or team when you take it up.
            </p>
          </div>
        </div>
        <Link
          to="/student/profile"
          className="shrink-0 text-[0.72rem] font-medium text-primary underline-offset-4 hover:underline"
        >
          Sharpen your profile
        </Link>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[0.65rem] text-foreground/75">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X className="size-2.5" />
      </button>
    </span>
  );
}
