import { Monogram } from "@/components/brand";
import {
  DifficultyBadge,
  Eyebrow,
  PageHeading,
  SlotsMeter,
} from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { splitCommaList } from "@/lib/format";
import { problemSchema, type ProblemValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleDashed,
  Clock3,
  Loader2,
  LockKeyhole,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

type PhaseDraft = {
  title: string;
  description: string;
  durationWeeks: string;
  skills: string;
  evaluationCriteria: string;
};

const blankPhase: PhaseDraft = {
  title: "",
  description: "",
  durationWeeks: "2",
  skills: "",
  evaluationCriteria: "",
};

function messageFor(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^ConvexError:\s*/i, "")
    .replace(/^\[CONVEX[^\]]*\]\s*/i, "")
    .trim();
}

export default function NewProblem() {
  const me = useQuery(api.profiles.me);
  const createProblem = useMutation(api.problems.create);
  const navigate = useNavigate();

  const [phases, setPhases] = useState<PhaseDraft[]>([{ ...blankPhase }]);
  const [phaseErrors, setPhaseErrors] = useState<Record<number, string>>({});
  const [publishError, setPublishError] = useState<string | null>(null);
  const [busyMode, setBusyMode] = useState<"draft" | "publish" | null>(null);

  const form = useForm<ProblemValues>({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      title: "",
      summary: "",
      description: "",
      domain: "",
      skills: "",
      difficulty: "intermediate",
      deadline: "",
      solutionCap: 50,
    },
  });

  const values = form.watch();
  const orgName = me?.organizationProfile?.companyName ?? "Your company";
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().slice(0, 10);
  }, []);

  function updatePhase(index: number, patch: Partial<PhaseDraft>) {
    setPhases((current) =>
      current.map((phase, phaseIndex) =>
        phaseIndex === index ? { ...phase, ...patch } : phase,
      ),
    );
    setPhaseErrors((current) => {
      if (!current[index]) return current;
      const next = { ...current };
      delete next[index];
      return next;
    });
  }

  async function save(input: ProblemValues, publish: boolean) {
    setPublishError(null);
    const deadlineTs = new Date(`${input.deadline}T23:59:00`).getTime();
    if (!Number.isFinite(deadlineTs) || deadlineTs < Date.now() + 24 * 60 * 60 * 1000) {
      form.setError("deadline", {
        message: "Pick a deadline at least one day from now.",
      });
      return;
    }

    const nextPhaseErrors: Record<number, string> = {};
    phases.forEach((phase, index) => {
      if (phase.title.trim().length < 3) {
        nextPhaseErrors[index] = "Add a phase title (3+ characters).";
      } else if (phase.description.trim().length < 10) {
        nextPhaseErrors[index] = "Describe what this phase should produce.";
      } else if (splitCommaList(phase.evaluationCriteria).length === 0) {
        nextPhaseErrors[index] = "Add at least one evaluation criterion.";
      }
    });
    if (Object.keys(nextPhaseErrors).length > 0) {
      setPhaseErrors(nextPhaseErrors);
      setPublishError("Give every phase a title, a short description, and at least one criterion.");
      return;
    }

    setBusyMode(publish ? "publish" : "draft");
    try {
      const result = await createProblem({
        title: input.title,
        summary: input.summary,
        description: input.description,
        domain: input.domain,
        skills: splitCommaList(input.skills),
        difficulty: input.difficulty,
        deadline: deadlineTs,
        solutionCap: input.solutionCap,
        publish,
        phases: phases.map((phase) => ({
          title: phase.title,
          description: phase.description,
          durationWeeks: Number(phase.durationWeeks) || 2,
          skills: splitCommaList(phase.skills),
          evaluationCriteria: splitCommaList(phase.evaluationCriteria),
        })),
      });
      toast.success(publish ? "Problem published." : "Draft saved.", {
        description: publish
          ? "It's live on the student board now."
          : "Publish it from your problems list whenever you're ready.",
      });
      navigate(
        publish ? `/org/problems/${result.problemId}` : "/org/problems",
      );
    } catch (error) {
      setPublishError(messageFor(error));
    } finally {
      setBusyMode(null);
    }
  }

  const submitDraft = form.handleSubmit((input) => void save(input, false));
  const submitPublish = form.handleSubmit((input) => void save(input, true));

  const phasePreviewCount = phases.length;
  const previewSkills = splitCommaList(values.skills);

  return (
    <div className="space-y-6">
      <Link
        to="/org/problems"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Your problems
      </Link>

      <PageHeading
        eyebrow="New problem"
        title="Put the real problem on the table."
        description="Context, constraints, and a clear phase plan are what make student work useful. Write it the way you'd explain it to a smart new teammate."
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="outline" className="gap-1.5 border-border bg-card">
              <Sparkles className="size-3 text-primary" />
              First-pass feedback included
            </Badge>
          </div>
        }
      />

      <Form {...form}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitPublish();
          }}
          className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-start"
        >
          <div className="space-y-5">
            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <Eyebrow>The brief</Eyebrow>
              <div className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Problem title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Design a subscription box unboxing that survives courier routes"
                          className="h-10 bg-background/70 shadow-none"
                          maxLength={140}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-baseline justify-between">
                        <FormLabel className="text-xs">One-line summary</FormLabel>
                        <span className="text-[0.65rem] tabular-nums text-muted-foreground">
                          {field.value.length}/240
                        </span>
                      </div>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="One in nine boxes arrives dented. Redesign the packaging within ₹96."
                          className="h-10 bg-background/70 shadow-none"
                          maxLength={240}
                        />
                      </FormControl>
                      <FormDescription className="text-[0.65rem]">
                        This is what students see on the board.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-baseline justify-between">
                        <FormLabel className="text-xs">Full context</FormLabel>
                        <span className="text-[0.65rem] tabular-nums text-muted-foreground">
                          {field.value.length.toLocaleString()}/6,000
                        </span>
                      </div>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={10}
                          placeholder={"What's happening now?\nWhat have you already tried?\nWhat does the student have access to?\nWhat are the constraints — budget, time, tools?"}
                          className="min-h-48 resize-y bg-background/70 text-[0.85rem] leading-6 shadow-none"
                          maxLength={6000}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <Eyebrow>Fit</Eyebrow>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Domain</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Brand & Packaging"
                            className="h-9 bg-background/70 shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Difficulty</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full bg-background/70 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Required skills</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Packaging Design, Materials Research, Cost Analysis"
                          className="h-9 bg-background/70 shadow-none"
                        />
                      </FormControl>
                      <FormDescription className="text-[0.65rem]">
                        Comma separated. These drive the student match ranking.
                      </FormDescription>
                      <div className="flex flex-wrap gap-1.5">
                        {splitCommaList(field.value).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[0.65rem]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <Eyebrow>Window & capacity</Eyebrow>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Deadline</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          min={tomorrow}
                          className="h-9 bg-background/70 shadow-none"
                        />
                      </FormControl>
                      <FormDescription className="text-[0.65rem]">
                        Submissions close automatically at 23:59 on this date.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="solutionCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Solution cap</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={1}
                          max={50}
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value) || 0)
                          }
                          className="h-9 bg-background/70 shadow-none"
                        />
                      </FormControl>
                      <FormDescription className="flex items-center gap-1 text-[0.65rem]">
                        <LockKeyhole className="size-2.5" />
                        Maximum 50. Default 50.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Eyebrow>Phases</Eyebrow>
                  <p className="mt-1 text-[0.72rem] text-muted-foreground">
                    One phase is fine. Add more and students pick the phase that
                    fits their expertise.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 bg-background text-xs"
                  onClick={() => setPhases((current) => [...current, { ...blankPhase }])}
                  disabled={phases.length >= 6}
                >
                  <Plus className="size-3.5" />
                  Add phase
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {phases.map((phase, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-xl border bg-background/40 p-4",
                      phaseErrors[index] ? "border-destructive/30" : "border-border/70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[0.7rem] font-semibold">
                        <span className="flex size-5 items-center justify-center rounded-full border border-primary/20 bg-accent/30 text-[0.6rem] text-primary">
                          {index + 1}
                        </span>
                        Phase {index + 1}
                        {phases.length > 1 ? (
                          <span className="text-[0.62rem] font-normal text-muted-foreground">
                            students choose one
                          </span>
                        ) : null}
                      </p>
                      {phases.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove phase ${index + 1}`}
                          onClick={() =>
                            setPhases((current) =>
                              current.filter((_, phaseIndex) => phaseIndex !== index),
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-2.5">
                      <Input
                        value={phase.title}
                        onChange={(event) => updatePhase(index, { title: event.target.value })}
                        placeholder="Phase title — e.g. Discovery & material shortlist"
                        aria-label={`Phase ${index + 1} title`}
                        className="h-9 bg-card text-xs shadow-none"
                        maxLength={100}
                      />
                      <Textarea
                        value={phase.description}
                        onChange={(event) =>
                          updatePhase(index, { description: event.target.value })
                        }
                        placeholder="What should this phase produce? What does done look like?"
                        aria-label={`Phase ${index + 1} description`}
                        rows={2}
                        className="resize-y bg-card text-xs shadow-none"
                        maxLength={1200}
                      />
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <Input
                          value={phase.skills}
                          onChange={(event) => updatePhase(index, { skills: event.target.value })}
                          placeholder="Phase skills (comma separated)"
                          aria-label={`Phase ${index + 1} skills`}
                          className="h-9 bg-card text-xs shadow-none"
                        />
                        <Input
                          value={phase.durationWeeks}
                          onChange={(event) =>
                            updatePhase(index, { durationWeeks: event.target.value })
                          }
                          type="number"
                          min={1}
                          max={12}
                          placeholder="Weeks"
                          aria-label={`Phase ${index + 1} duration in weeks`}
                          className="h-9 bg-card text-xs shadow-none"
                        />
                      </div>
                      <Input
                        value={phase.evaluationCriteria}
                        onChange={(event) =>
                          updatePhase(index, { evaluationCriteria: event.target.value })
                        }
                        placeholder="Evaluation criteria, comma separated (e.g. Clarity, Evidence, Feasibility)"
                        aria-label={`Phase ${index + 1} evaluation criteria`}
                        className="h-9 bg-card text-xs shadow-none"
                      />
                    </div>

                    {phaseErrors[index] ? (
                      <p className="mt-2 flex items-center gap-1 text-[0.68rem] text-destructive">
                        <AlertCircle className="size-3" />
                        {phaseErrors[index]}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {publishError ? (
              <p
                className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                {publishError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.68rem] leading-4 text-muted-foreground">
                Drafts are private. Publishing makes the brief visible to every
                student on the board.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 bg-background"
                  onClick={submitDraft}
                  disabled={busyMode !== null}
                >
                  {busyMode === "draft" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save draft
                </Button>
                <Button
                  type="button"
                  className="gap-1.5"
                  onClick={submitPublish}
                  disabled={busyMode !== null}
                >
                  {busyMode === "publish" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Rocket className="size-4" />
                  )}
                  Publish problem
                </Button>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border/70 bg-card p-5 soft-card">
              <div className="flex items-center justify-between gap-2">
                <Eyebrow>Student preview</Eyebrow>
                <Badge variant="outline" className="border-border bg-background text-[0.6rem]">
                  Live card
                </Badge>
              </div>

              <div className="mt-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Monogram name={orgName} className="size-9 rounded-lg" />
                  <div>
                    <p className="text-[0.78rem] font-semibold">{orgName}</p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      {values.domain || "Your domain"}
                    </p>
                  </div>
                </div>
                <DifficultyBadge value={values.difficulty} />
              </div>

              <h3 className="mt-4 font-display text-[1.35rem] font-semibold leading-[1.15]">
                {values.title || "Your problem title will appear here"}
              </h3>
              <p className="mt-2 line-clamp-3 text-[0.78rem] leading-5 text-muted-foreground">
                {values.summary ||
                  "A one-line summary helps students decide in seconds whether this brief fits what they can do."}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {previewSkills.length > 0 ? (
                  previewSkills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-border/80 bg-background px-2 py-0.5 text-[0.64rem] text-foreground/65"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[0.64rem] text-muted-foreground">
                    Add required skills
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CircleDashed className="size-3" />
                  {phasePreviewCount} phase{phasePreviewCount === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3" />
                  {values.deadline
                    ? new Date(`${values.deadline}T23:59:00`).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Pick a deadline"}
                </span>
              </div>

              <div className="mt-4 border-t border-border/60 pt-3">
                <SlotsMeter count={0} cap={Number(values.solutionCap) || 50} compact />
                <div className="mt-3 flex items-center justify-between text-[0.65rem] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    Solo or team
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    View brief
                    <Check className="size-3" />
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-card/50 p-4">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                What makes a good brief
              </p>
              <ul className="mt-2.5 space-y-2">
                {[
                  "Real constraints: budget, timeline, tools, access.",
                  "A clear artifact: what should exist at the end?",
                  "Criteria that let a reviewer say yes or no.",
                  "The messy context — students can handle it.",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-[0.7rem] leading-4 text-muted-foreground">
                    <Check className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={2.4} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 rounded-2xl border border-primary/10 bg-accent/15 p-4"
            >
              <p className="flex items-start gap-2 text-[0.7rem] leading-5 text-foreground/75">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Every submission is reviewed against your criteria, with a
                structured first pass. You keep the final call.
              </p>
            </motion.div>
          </aside>
        </form>
      </Form>
    </div>
  );
}
