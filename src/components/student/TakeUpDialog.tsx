import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Check,
  Loader2,
  LockKeyhole,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type Phase = {
  _id: Id<"phases">;
  order: number;
  title: string;
  description: string;
  evaluationCriteria: string[];
  skills: string[];
  durationWeeks: number;
};

type Problem = {
  _id: Id<"problems">;
  title: string;
  isMultiPhase: boolean;
  solutionCap: number;
  solutionCount: number;
};

function messageFor(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^ConvexError:\s*/i, "")
    .replace(/^\[CONVEX[^\]]*\]\s*/i, "")
    .trim();
}

export function TakeUpDialog({
  problem,
  phases,
  open,
  onOpenChange,
}: {
  problem: Problem;
  phases: Phase[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const me = useQuery(api.profiles.me);
  const takeUp = useMutation(api.assignments.takeUp);

  const [mode, setMode] = useState<"solo" | "team">("solo");
  const [phaseId, setPhaseId] = useState<Id<"phases"> | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [leadEmail, setLeadEmail] = useState("me");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileSkills = me?.studentProfile?.skills ?? [];
  const matchingCounts = useMemo(() => {
    const set = new Set(profileSkills.map((skill) => skill.toLowerCase()));
    return new Map(
      phases.map((phase) => [
        phase._id,
        phase.skills.filter((skill) => set.has(skill.toLowerCase())).length,
      ]),
    );
  }, [phases, profileSkills]);

  useEffect(() => {
    if (!open) return;
    if (phases.length === 1) {
      setPhaseId(phases[0]._id);
      return;
    }
    const best = [...phases].sort(
      (a, b) => (matchingCounts.get(b._id) ?? 0) - (matchingCounts.get(a._id) ?? 0),
    )[0];
    setPhaseId(best?._id ?? phases[0]?._id ?? null);
  }, [open, phases, matchingCounts]);

  useEffect(() => {
    if (!open) {
      setMode("solo");
      setTeamName("");
      setInviteEmails("");
      setLeadEmail("me");
      setAcknowledged(false);
      setError(null);
    }
  }, [open]);

  const emails = useMemo(
    () =>
      Array.from(
        new Set(
          inviteEmails
            .split(/[\s,;]+/)
            .map((email) => email.trim().toLowerCase())
            .filter((email) => email.includes("@")),
        ),
      ).slice(0, 4),
    [inviteEmails],
  );

  const canSubmit =
    acknowledged &&
    !busy &&
    phaseId !== null &&
    (mode === "solo" || teamName.trim().length >= 2) &&
    (mode === "team"
      ? inviteEmails.trim() === "" ||
        emails.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      : true);

  async function handleTakeUp() {
    if (!phaseId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await takeUp({
        problemId: problem._id,
        mode,
        phaseId,
        teamName: mode === "team" ? teamName.trim() : undefined,
        inviteEmails: mode === "team" ? emails : undefined,
        leadEmail:
          mode === "team" && leadEmail !== "me" ? leadEmail : undefined,
      });
      toast.success(
        result.reachedCap
          ? "You took the final slot. This brief is now full."
          : "You're in. The brief is on your work board.",
      );
      onOpenChange(false);
      navigate(`/student/work/${result.assignmentId}`);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  const selectedPhase = phases.find((phase) => phase._id === phaseId) ?? null;

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/70 px-6 py-5 pr-12">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Take up brief
          </p>
          <DialogTitle className="mt-1 font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.01em]">
            {problem.title}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs leading-5">
            Choose how you'll work and which phase you're contributing to. This
            choice is recorded and can't be changed silently.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground">
                1
              </span>
              <h3 className="text-sm font-semibold">How will you work?</h3>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    value: "solo" as const,
                    title: "Solo",
                    description:
                      "Own the phase end to end. You can still ask the org questions.",
                    icon: UserRound,
                  },
                  {
                    value: "team" as const,
                    title: "Team",
                    description:
                      "Invite up to four people. One lead submits for the team.",
                    icon: Users,
                  },
                ]
              ).map((option) => {
                const selected = mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMode(option.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                      selected
                        ? "border-primary bg-accent/25 ring-1 ring-primary/15"
                        : "border-border bg-background/60 hover:border-primary/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-primary",
                      )}
                    >
                      <option.icon className="size-4" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        {option.title}
                        {selected ? (
                          <Check className="size-3.5 text-primary" strokeWidth={2.6} />
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[0.72rem] leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {phases.length > 1 ? (
            <section>
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground">
                  2
                </span>
                <h3 className="text-sm font-semibold">Which phase fits your expertise?</h3>
              </div>
              <p className="mt-1 pl-7 text-[0.72rem] text-muted-foreground">
                This brief is phase-based. Each phase takes independent
                submissions, so pick the one you can do well.
              </p>
              <div className="mt-3 space-y-2">
                {phases.map((phase) => {
                  const selected = phaseId === phase._id;
                  const matches = matchingCounts.get(phase._id) ?? 0;
                  return (
                    <button
                      key={phase._id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPhaseId(phase._id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                        selected
                          ? "border-primary bg-accent/20 ring-1 ring-primary/15"
                          : "border-border bg-background/50 hover:border-primary/30",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {phase.order}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{phase.title}</span>
                          {matches > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-accent/40 px-2 py-0.5 text-[0.6rem] font-medium text-primary">
                              <Sparkles className="size-2.5" />
                              {matches} matching {matches === 1 ? "skill" : "skills"}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[0.72rem] leading-5 text-muted-foreground">
                          {phase.description}
                        </span>
                        <span className="mt-1.5 block text-[0.65rem] text-muted-foreground/80">
                          {phase.durationWeeks} week
                          {phase.durationWeeks === 1 ? "" : "s"} ·{" "}
                          {phase.evaluationCriteria.length} review criteria
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-primary bg-primary" : "border-border",
                        )}
                      >
                        {selected ? (
                          <Check
                            className="size-2.5 text-primary-foreground"
                            strokeWidth={3}
                          />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {mode === "team" ? (
            <section>
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground">
                  {phases.length > 1 ? 3 : 2}
                </span>
                <h3 className="text-sm font-semibold">Build your team</h3>
              </div>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="teamName"
                    className="text-xs font-medium text-foreground/85"
                  >
                    Team name
                  </label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="The Marginal Gains"
                    maxLength={60}
                    className="h-9 bg-background/70 shadow-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="inviteEmails"
                    className="flex items-baseline justify-between text-xs font-medium text-foreground/85"
                  >
                    <span>Invite teammates</span>
                    <span className="text-[0.65rem] font-normal text-muted-foreground">
                      up to 4 · comma separated
                    </span>
                  </label>
                  <Input
                    id="inviteEmails"
                    value={inviteEmails}
                    onChange={(event) => {
                      setInviteEmails(event.target.value);
                      setLeadEmail("me");
                    }}
                    placeholder="rohit@college.edu, meera@college.edu"
                    className="h-9 bg-background/70 shadow-none"
                  />
                  <p className="text-[0.65rem] leading-4 text-muted-foreground">
                    Teammates with an Udbhava account get a notification; others
                    stay as invited guests.
                  </p>
                </div>
                {emails.length > 0 ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground/85">
                      Who leads the submission?
                    </label>
                    <Select value={leadEmail} onValueChange={setLeadEmail}>
                      <SelectTrigger className="h-9 w-full bg-background/70 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="me">Me — I'll submit</SelectItem>
                        {emails.map((email) => (
                          <SelectItem key={email} value={email}>
                            {email} (if registered)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[0.65rem] text-muted-foreground">
                      Only the lead can submit. You can change the lead later
                      from your workspace.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-border/70 bg-background/50 p-3.5">
            <div className="flex items-start gap-2.5">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.8} />
              <div className="text-[0.72rem] leading-5 text-muted-foreground">
                <p className="font-medium text-foreground">
                  This choice is captured at take-up.
                </p>
                <p className="mt-0.5">
                  {mode === "team"
                    ? "Team members can't switch to solo, and the problem can't be taken twice. You can still leave your team name and invite list unchanged."
                    : "Solo mode can't be switched to a team after submission. Pick a team now if you want collaborators."}
                </p>
                {selectedPhase ? (
                  <p className="mt-1.5">
                    Submitting to{" "}
                    <span className="font-medium text-foreground">
                      Phase {selectedPhase.order}: {selectedPhase.title}
                    </span>
                    .
                  </p>
                ) : null}
                <p className="mt-1.5">
                  {problem.solutionCount} of {problem.solutionCap} slots already
                  taken. The brief closes when all 50 are gone.
                </p>
              </div>
            </div>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-1 py-1">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              className="mt-0.5"
              aria-label="Confirm your mode and phase choice"
            />
            <span className="text-[0.72rem] leading-5 text-foreground/80">
              I understand this records my{" "}
              <span className="font-medium">{mode}</span> choice
              {selectedPhase ? (
                <>
                  {" "}
                  and my phase selection (
                  <span className="font-medium">{selectedPhase.title}</span>)
                </>
              ) : null}
              .
            </span>
          </label>

          {error ? (
            <p
              className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/70 bg-card px-6 py-4 sm:items-center sm:justify-between">
          <p className="hidden text-[0.65rem] text-muted-foreground sm:block">
            You can submit multiple versions before the deadline.
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleTakeUp()}
              disabled={!canSubmit}
              className="gap-2"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Take up this brief
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
