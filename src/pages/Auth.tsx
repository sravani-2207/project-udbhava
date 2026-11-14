import { BrandLink, LotusMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { splitCommaList } from "@/lib/format";
import {
  organizationOnboardingSchema,
  studentOnboardingSchema,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import type { z } from "zod";

type Role = "student" | "organization";
type Step = "role" | "details" | "email" | "code";

type Details = {
  fullName: string;
  university: string;
  year: string;
  headline: string;
  skills: string;
  domains: string;
  bio: string;
  availability: string;
  companyName: string;
  contactName: string;
  industry: string;
  companySize: string;
  location: string;
  website: string;
  about: string;
};

const blankDetails: Details = {
  fullName: "",
  university: "",
  year: "Final year",
  headline: "",
  skills: "",
  domains: "",
  bio: "",
  availability: "10–15 hrs / week",
  companyName: "",
  contactName: "",
  industry: "",
  companySize: "1–10 people",
  location: "",
  website: "",
  about: "",
};

const years = ["First year", "Second year", "Third year", "Final year", "Graduated"];
const availabilities = [
  "5–10 hrs / week",
  "10–15 hrs / week",
  "15–20 hrs / week",
  "20+ hrs / week",
];
const sizes = ["1–10 people", "11–50 people", "51–200 people", "200+ people"];

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^ConvexError:\s*/i, "")
    .replace(/^\[CONVEX[^\]]*\]\s*/i, "")
    .replace(/^Server Error\s*/i, "")
    .trim();
}

function safeReturnTo(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/auth")) {
    return null;
  }
  return value;
}

function homeFor(role: Role): string {
  return role === "organization" ? "/org" : "/student";
}

function FieldBlock({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between gap-3 text-xs font-medium text-foreground/85"
      >
        <span>{label}</span>
        {hint ? (
          <span className="text-[0.65rem] font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-[0.7rem] font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "h-10 rounded-lg border-border bg-background/70 text-sm shadow-none focus-visible:ring-primary/20";

function ProgressDots({ step }: { step: Step }) {
  const order: Step[] = ["role", "details", "email", "code"];
  const index = order.indexOf(step);
  const labels = ["Role", "Details", "Verify"];
  const visualIndex = Math.min(index, 2);
  return (
    <div className="flex items-center gap-2.5" aria-label={`Step ${visualIndex + 1} of 3`}>
      {labels.map((label, itemIndex) => (
        <span key={label} className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.14em]",
              itemIndex <= visualIndex ? "text-primary" : "text-muted-foreground/60",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full border text-[0.55rem]",
                itemIndex < visualIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : itemIndex === visualIndex
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground/60",
              )}
            >
              {itemIndex < visualIndex ? (
                <Check className="size-2.5" strokeWidth={3} />
              ) : (
                itemIndex + 1
              )}
            </span>
            {label}
          </span>
          {itemIndex < labels.length - 1 ? (
            <span className="h-px w-5 bg-border" />
          ) : null}
        </span>
      ))}
    </div>
  );
}

function AuthPage() {
  const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const completeOnboarding = useMutation(api.profiles.completeOnboarding);
  const startDemo = useMutation(api.demo.start);
  const stats = useQuery(api.problems.publicStats);

  const roleParam = searchParams.get("role");
  const initialRole: Role | null =
    roleParam === "student" || roleParam === "organization" ? roleParam : null;
  const initialSignIn = searchParams.get("mode") === "signin";

  const [role, setRole] = useState<Role | null>(initialRole);
  const [mode, setMode] = useState<"signup" | "signin">(
    initialSignIn ? "signin" : "signup",
  );
  const [step, setStep] = useState<Step>(initialSignIn ? "email" : "role");
  const [details, setDetails] = useState<Details>(blankDetails);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "verify" | "demo-student" | "demo-org" | "finish" | null>(
    null,
  );
  const pendingDetails = useRef<{
    role: Role;
    values: z.infer<typeof studentOnboardingSchema> | z.infer<typeof organizationOnboardingSchema>;
  } | null>(null);
  const demoInFlight = useRef(false);
  const [pendingDemoRole, setPendingDemoRole] = useState<Role | null>(null);

  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  // A returning account always continues to its own workspace (or the page it
  // originally asked for), never back to the public landing page.
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.role || demoInFlight.current) return;
    if (user.role === "admin") return;
    const home = user.role === "organization" ? "/org" : "/student";
    navigate(returnTo ?? home, { replace: true });
  }, [isLoading, isAuthenticated, user?.role, navigate, returnTo]);

  // Signed-in but role-less (e.g. an OTP account that never finished setup):
  // finish the role and details steps instead of showing email again.
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      !user.role &&
      !demoInFlight.current &&
      (step === "email" || step === "code") &&
      !busy
    ) {
      setStep("role");
    }
  }, [isAuthenticated, user, step, busy]);

  function update<K extends keyof Details>(key: K, value: Details[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function buildStudentPayload(values: z.infer<typeof studentOnboardingSchema>) {
    return {
      role: "student" as const,
      fullName: values.fullName,
      headline: values.headline,
      university: values.university,
      year: values.year,
      bio: values.bio,
      skills: splitCommaList(values.skills),
      interests: splitCommaList(values.domains),
      domains: splitCommaList(values.domains),
      availability: values.availability,
      links: [],
      showcase: [],
    };
  }

  function buildOrgPayload(values: z.infer<typeof organizationOnboardingSchema>) {
    return {
      role: "organization" as const,
      companyName: values.companyName,
      contactName: values.contactName,
      website: values.website || undefined,
      industry: values.industry,
      companySize: values.companySize,
      location: values.location,
      about: values.about,
    };
  }

  function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!role) {
      setStep("role");
      return;
    }
    const issueMap: Record<string, string> = {};

    if (role === "student") {
      const parsed = studentOnboardingSchema.safeParse(details);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          issueMap[String(issue.path[0])] = issue.message;
        }
        setErrors(issueMap);
        return;
      }
      pendingDetails.current = { role, values: parsed.data };
    } else {
      const parsed = organizationOnboardingSchema.safeParse(details);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          issueMap[String(issue.path[0])] = issue.message;
        }
        setErrors(issueMap);
        return;
      }
      pendingDetails.current = { role, values: parsed.data };
    }
    setErrors({});
    if (isAuthenticated && !user?.role) {
      void finishOnboarding();
      return;
    }
    setStep("email");
  }

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setFormError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrors({ email: "Enter a valid email address." });
      return;
    }
    setBusy("send");
    try {
      await signIn("email-otp", { email: trimmed });
      setEmail(trimmed);
      setCode("");
      setStep("code");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function finishOnboarding() {
    const pending = pendingDetails.current;
    if (!pending) return false;
    setBusy("finish");
    try {
      const result = await completeOnboarding(
        pending.role === "student"
          ? buildStudentPayload(pending.values as z.infer<typeof studentOnboardingSchema>)
          : buildOrgPayload(pending.values as z.infer<typeof organizationOnboardingSchema>),
      );
      const home = homeFor(result.role);
      pendingDetails.current = null;
      toast.success("Your workspace is ready.");
      navigate(returnTo ?? home, { replace: true });
      return true;
    } catch (error) {
      const message = errorMessage(error);
      setFormError(
        message.includes("different role")
          ? "That email already has an account with a different role. Sign in to continue there."
          : message,
      );
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (code.length !== 6) return;
    setBusy("verify");
    try {
      await signIn("email-otp", { email, code });
      if (pendingDetails.current) {
        await finishOnboarding();
      } else {
        toast.success("Welcome back.");
        const targetRole = user?.role;
        if (targetRole === "student" || targetRole === "organization") {
          navigate(returnTo ?? homeFor(targetRole), { replace: true });
        }
      }
    } catch {
      setFormError("That code didn't work. Check the six digits and try again.");
      setCode("");
    } finally {
      setBusy(null);
    }
  }

 async function enterDemo(demoRole: Role) {
  setFormError(null);
  setBusy(demoRole === "student" ? "demo-student" : "demo-org");
  demoInFlight.current = true;

  try {
    if (isAuthenticated) {
      await signOut();
    }

    await signIn("anonymous");

    // Wait for Convex to confirm the anonymous session.
    setPendingDemoRole(demoRole);
  } catch (error) {
    demoInFlight.current = false;
    setFormError(errorMessage(error));
    setBusy(null);
  }
}
useEffect(() => {
  if (!pendingDemoRole || !isAuthenticated) return;

  let cancelled = false;

  async function completeDemo() {
    try {
      await startDemo({ role: pendingDemoRole! });

      if (cancelled) return;

      toast.success(
        pendingDemoRole === "student"
          ? "Demo student workspace ready."
          : "Demo startup workspace ready.",
      );

      navigate(homeFor(pendingDemoRole!), { replace: true });
    } catch (error) {
      if (!cancelled) {
        setFormError(errorMessage(error));
      }
    } finally {
      if (!cancelled) {
        setPendingDemoRole(null);
        demoInFlight.current = false;
        setBusy(null);
      }
    }
  }

  void completeDemo();

  return () => {
    cancelled = true;
  };
}, [pendingDemoRole, isAuthenticated, startDemo, navigate]);

  function back() {
    setFormError(null);
    if (step === "code") setStep("email");
    else if (step === "email") {
      if (isAuthenticated && !user?.role) setStep("role");
      else setStep("details");
    } else if (step === "details") setStep("role");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <LotusMark className="h-8 w-auto animate-pulse text-primary" />
          <p className="text-xs text-muted-foreground">Opening Udbhava…</p>
        </div>
      </main>
    );
  }

  const signingIn = mode === "signin" && !(isAuthenticated && !user?.role);
  const showDetails = step === "details";
  const roleChosen = role !== null;

  const skillsPreview = splitCommaList(details.skills).slice(0, 6);
  const domainsPreview = splitCommaList(details.domains).slice(0, 4);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary px-10 py-9 text-primary-foreground lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-10 opacity-[0.12]"
        >
          <LotusMark className="h-[30rem] w-auto text-primary-foreground" strokeWidth={0.55} />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 opacity-[0.08]"
        >
          <LotusMark className="h-96 w-auto text-primary-foreground" strokeWidth={0.6} />
        </div>

        <div className="relative flex items-center justify-between">
          <BrandLink inverted />
          <span className="rounded-full border border-primary-foreground/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
            For teams of 1–50
          </span>
        </div>

        <div className="relative my-auto max-w-md py-16">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-primary-foreground/60">
            The student–startup exchange
          </p>
          <p className="mt-6 font-display text-[2.9rem] font-medium leading-[1.05] tracking-[-0.02em]">
            Good work begins
            <br />
            with a <em className="italic text-primary-foreground/75">real</em>
            <br />
            problem.
          </p>
          <p className="mt-6 max-w-sm text-sm leading-6 text-primary-foreground/65">
            Post the challenge your team keeps postponing. Or bring your skills
            to one and see what happens when the brief is honest.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-primary-foreground/15 pt-6">
            <div>
              <p className="font-display text-2xl font-semibold">{stats?.openProblems ?? "—"}</p>
              <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-primary-foreground/55">
                Live briefs
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">{stats?.startups ?? "—"}</p>
              <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-primary-foreground/55">
                Startups
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">50</p>
              <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-primary-foreground/55">
                Solution cap
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[0.68rem] text-primary-foreground/55">
          <LockKeyhole className="size-3.5" />
          Passwordless sign-in · your work stays yours
        </div>
      </aside>

      {/* Form panel */}
      <main className="paper-wash flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-6 sm:px-8 lg:hidden">
          <BrandLink />
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Join the exchange
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-9 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[31rem]"
          >
            <div className="rounded-2xl border border-border/80 bg-card/95 p-6 soft-card sm:p-8">
              {(step === "details" || step === "code" || (step === "email" && !signingIn)) ? (
                <button
                  type="button"
                  onClick={back}
                  className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>
              ) : null}

              {step === "role" ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Create your account
                      </p>
                      <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[1.04] tracking-[-0.02em]">
                        How will you
                        <br />
                        use <em className="italic text-primary">Udbhava?</em>
                      </h1>
                    </div>
                    <LotusMark className="mt-1 hidden h-8 w-auto shrink-0 text-primary/30 sm:block" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Pick your role first — it shapes the workspace you get, and
                    it can't be switched later by accident.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: "student" as const,
                          title: "Student",
                          description:
                            "Solve real briefs, build a body of work, and receive opportunities.",
                          icon: GraduationCap,
                          tag: "Solo or team",
                        },
                        {
                          value: "organization" as const,
                          title: "Startup",
                          description:
                            "Post the problem you're stuck on and review real solutions.",
                          icon: Building2,
                          tag: "1–50 people",
                        },
                      ]
                    ).map((option) => {
                      const selected = role === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setRole(option.value);
                            setErrors({});
                            setFormError(null);
                          }}
                          aria-pressed={selected}
                          className={cn(
                            "group relative flex flex-col rounded-xl border p-4 text-left transition-all",
                            selected
                              ? "border-primary bg-accent/25 ring-1 ring-primary/20"
                              : "border-border bg-background/60 hover:border-primary/30 hover:bg-background",
                          )}
                        >
                          <span className="flex items-center justify-between">
                            <span
                              className={cn(
                                "flex size-9 items-center justify-center rounded-lg",
                                selected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-primary",
                              )}
                            >
                              <option.icon className="size-[1.05rem]" strokeWidth={1.7} />
                            </span>
                            <span
                              className={cn(
                                "flex size-4 items-center justify-center rounded-full border",
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border",
                              )}
                            >
                              {selected ? <Check className="size-2.5" strokeWidth={3} /> : null}
                            </span>
                          </span>
                          <span className="mt-4 text-sm font-semibold">{option.title}</span>
                          <span className="mt-1.5 text-[0.75rem] leading-5 text-muted-foreground">
                            {option.description}
                          </span>
                          <span className="mt-3 inline-flex w-fit rounded-full border border-border/70 bg-card px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                            {option.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    className="mt-6 h-11 w-full gap-2 rounded-lg"
                    disabled={!roleChosen}
                    onClick={() => setStep("details")}
                  >
                    Continue as {role === "organization" ? "a startup" : role === "student" ? "a student" : "…"}
                    <ArrowRight className="size-4" />
                  </Button>

                  {formError ? (
                    <p className="mt-3 text-xs font-medium text-destructive" role="alert">
                      {formError}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-col items-center gap-1.5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
                    <p>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => {
                          setMode("signin");
                          setStep("email");
                          setFormError(null);
                        }}
                      >
                        Sign in
                      </button>
                    </p>
                    <p className="text-[0.68rem]">
                      Admin access is managed separately and is not self-serve.
                    </p>
                  </div>

                  <div className="mt-5 rounded-xl border border-dashed border-border bg-background/50 p-3.5">
                    <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Sparkles className="size-3 text-primary" />
                      In a hurry? Explore a filled demo
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void enterDemo("student")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[0.72rem] font-medium transition-colors hover:border-primary/30 disabled:opacity-50"
                      >
                        {busy === "demo-student" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <GraduationCap className="size-3.5 text-primary" />
                        )}
                        Student demo
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void enterDemo("organization")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[0.72rem] font-medium transition-colors hover:border-primary/30 disabled:opacity-50"
                      >
                        {busy === "demo-org" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Building2 className="size-3.5 text-primary" />
                        )}
                        Startup demo
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {showDetails ? (
                <form onSubmit={submitDetails} noValidate>
                  <ProgressDots step={step} />
                  <h1 className="mt-5 font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em]">
                    {role === "student" ? (
                      <>
                        Tell us what you're
                        <br />
                        <em className="italic text-primary">good at.</em>
                      </>
                    ) : (
                      <>
                        Tell us about
                        <br />
                        <em className="italic text-primary">your company.</em>
                      </>
                    )}
                  </h1>
                  <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
                    {role === "student"
                      ? "This feeds the ranking on your problems board. You can refine everything later in your profile."
                      : "This is what students see beside your brief. Keep it real — small teams are the point."}
                  </p>

                  {role === "student" ? (
                    <div className="mt-6 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldBlock
                          label="Full name"
                          htmlFor="fullName"
                          error={errors.fullName}
                        >
                          <Input
                            id="fullName"
                            value={details.fullName}
                            onChange={(event) => update("fullName", event.target.value)}
                            placeholder="Aanya Kapoor"
                            className={inputClass}
                            autoComplete="name"
                          />
                        </FieldBlock>
                        <FieldBlock
                          label="University / school"
                          htmlFor="university"
                          error={errors.university}
                        >
                          <Input
                            id="university"
                            value={details.university}
                            onChange={(event) => update("university", event.target.value)}
                            placeholder="Srishti Manipal"
                            className={inputClass}
                          />
                        </FieldBlock>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldBlock label="Year" htmlFor="year" error={errors.year}>
                          <select
                            id="year"
                            value={details.year}
                            onChange={(event) => update("year", event.target.value)}
                            className={cn(inputClass, "w-full px-3")}
                          >
                            {years.map((year) => (
                              <option key={year}>{year}</option>
                            ))}
                          </select>
                        </FieldBlock>
                        <FieldBlock
                          label="Availability"
                          htmlFor="availability"
                          error={errors.availability}
                        >
                          <select
                            id="availability"
                            value={details.availability}
                            onChange={(event) => update("availability", event.target.value)}
                            className={cn(inputClass, "w-full px-3")}
                          >
                            {availabilities.map((value) => (
                              <option key={value}>{value}</option>
                            ))}
                          </select>
                        </FieldBlock>
                      </div>

                      <FieldBlock
                        label="Headline"
                        htmlFor="headline"
                        error={errors.headline}
                        hint="one line"
                      >
                        <Input
                          id="headline"
                          value={details.headline}
                          onChange={(event) => update("headline", event.target.value)}
                          placeholder="Service designer who prototypes in the field"
                          className={inputClass}
                          maxLength={120}
                        />
                      </FieldBlock>

                      <FieldBlock
                        label="Skills"
                        htmlFor="skills"
                        error={errors.skills}
                        hint="comma separated"
                      >
                        <Input
                          id="skills"
                          value={details.skills}
                          onChange={(event) => update("skills", event.target.value)}
                          placeholder="User Research, Figma, Prototyping"
                          className={inputClass}
                        />
                        {skillsPreview.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {skillsPreview.map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full border border-border/80 bg-secondary/60 px-2 py-0.5 text-[0.65rem] text-foreground/70"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </FieldBlock>

                      <FieldBlock
                        label="Domains you care about"
                        htmlFor="domains"
                        error={errors.domains}
                        hint="comma separated"
                      >
                        <Input
                          id="domains"
                          value={details.domains}
                          onChange={(event) => update("domains", event.target.value)}
                          placeholder="Product & Service Design, Sustainability"
                          className={inputClass}
                        />
                        {domainsPreview.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {domainsPreview.map((domain) => (
                              <span
                                key={domain}
                                className="rounded-full border border-border/80 bg-secondary/60 px-2 py-0.5 text-[0.65rem] text-foreground/70"
                              >
                                {domain}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </FieldBlock>

                      <FieldBlock
                        label="Short bio"
                        htmlFor="bio"
                        error={errors.bio}
                        hint="optional"
                      >
                        <textarea
                          id="bio"
                          value={details.bio}
                          onChange={(event) => update("bio", event.target.value)}
                          placeholder="What kind of problems do you gravitate toward?"
                          rows={3}
                          className={cn(
                            inputClass,
                            "h-auto w-full resize-none px-3 py-2.5",
                          )}
                          maxLength={800}
                        />
                      </FieldBlock>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldBlock
                          label="Company name"
                          htmlFor="companyName"
                          error={errors.companyName}
                        >
                          <Input
                            id="companyName"
                            value={details.companyName}
                            onChange={(event) => update("companyName", event.target.value)}
                            placeholder="Atelier Nine"
                            className={inputClass}
                            autoComplete="organization"
                          />
                        </FieldBlock>
                        <FieldBlock
                          label="Your name"
                          htmlFor="contactName"
                          error={errors.contactName}
                        >
                          <Input
                            id="contactName"
                            value={details.contactName}
                            onChange={(event) => update("contactName", event.target.value)}
                            placeholder="Priya Raghavan"
                            className={inputClass}
                            autoComplete="name"
                          />
                        </FieldBlock>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldBlock
                          label="Industry"
                          htmlFor="industry"
                          error={errors.industry}
                        >
                          <Input
                            id="industry"
                            value={details.industry}
                            onChange={(event) => update("industry", event.target.value)}
                            placeholder="D2C kitchenware"
                            className={inputClass}
                          />
                        </FieldBlock>
                        <FieldBlock
                          label="Team size"
                          htmlFor="companySize"
                          error={errors.companySize}
                        >
                          <select
                            id="companySize"
                            value={details.companySize}
                            onChange={(event) => update("companySize", event.target.value)}
                            className={cn(inputClass, "w-full px-3")}
                          >
                            {sizes.map((size) => (
                              <option key={size}>{size}</option>
                            ))}
                          </select>
                        </FieldBlock>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldBlock
                          label="City"
                          htmlFor="location"
                          error={errors.location}
                        >
                          <Input
                            id="location"
                            value={details.location}
                            onChange={(event) => update("location", event.target.value)}
                            placeholder="Bengaluru"
                            className={inputClass}
                          />
                        </FieldBlock>
                        <FieldBlock
                          label="Website"
                          htmlFor="website"
                          error={errors.website}
                          hint="optional"
                        >
                          <Input
                            id="website"
                            value={details.website}
                            onChange={(event) => update("website", event.target.value)}
                            placeholder="https://"
                            className={inputClass}
                          />
                        </FieldBlock>
                      </div>

                      <FieldBlock
                        label="What does your team do?"
                        htmlFor="about"
                        error={errors.about}
                        hint="2–3 sentences"
                      >
                        <textarea
                          id="about"
                          value={details.about}
                          onChange={(event) => update("about", event.target.value)}
                          placeholder="We make small-batch kitchenware for Indian homes and ship 4,000 orders a month…"
                          rows={4}
                          className={cn(inputClass, "h-auto w-full resize-none px-3 py-2.5")}
                          maxLength={1200}
                        />
                      </FieldBlock>
                    </div>
                  )}

                  {formError ? (
                    <p className="mt-4 text-xs font-medium text-destructive" role="alert">
                      {formError}
                    </p>
                  ) : null}

                  <Button type="submit" className="mt-6 h-11 w-full gap-2 rounded-lg">
                    Continue
                    <ArrowRight className="size-4" />
                  </Button>
                  <p className="mt-3 text-center text-[0.68rem] text-muted-foreground">
                    Next: a six-digit code by email. No password needed.
                  </p>
                </form>
              ) : null}

              {step === "email" ? (
                <>
                  {signingIn ? (
                    <>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Welcome back
                      </p>
                      <h1 className="mt-2 font-display text-[2.2rem] font-semibold leading-[1.04] tracking-[-0.02em]">
                        Sign in to your
                        <br />
                        <em className="italic text-primary">workspace.</em>
                      </h1>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        We'll email a six-digit code. It's the only password you
                        need.
                      </p>
                    </>
                  ) : (
                    <>
                      <ProgressDots step={step} />
                      <h1 className="mt-5 font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em]">
                        Where should we send
                        <br />
                        <em className="italic text-primary">your code?</em>
                      </h1>
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                          <GraduationCap className="size-4" strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                            Joining as {role === "organization" ? "a startup" : "a student"}
                          </p>
                          <p className="truncate text-xs font-medium">
                            {role === "student" ? details.fullName : details.companyName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep("details")}
                          className="ml-auto text-[0.7rem] font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </>
                  )}

                  <form onSubmit={sendCode} className="mt-6 space-y-4" noValidate>
                    <FieldBlock label="Email address" htmlFor="email" error={errors.email}>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value);
                            setErrors({});
                          }}
                          placeholder="you@example.com"
                          className={cn(inputClass, "pl-9")}
                          autoComplete="email"
                          autoFocus
                        />
                      </div>
                    </FieldBlock>

                    {formError ? (
                      <p className="text-xs font-medium text-destructive" role="alert">
                        {formError}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      className="h-11 w-full gap-2 rounded-lg"
                      disabled={busy !== null}
                    >
                      {busy === "send" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Sending code…
                        </>
                      ) : (
                        <>
                          Send me a code
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-5 flex flex-col items-center gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground">
                    <p>
                      {signingIn ? (
                        <>
                          New to Udbhava?{" "}
                          <button
                            type="button"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            onClick={() => {
                              setMode("signup");
                              setStep("role");
                              setFormError(null);
                            }}
                          >
                            Create an account
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{" "}
                          <button
                            type="button"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            onClick={() => {
                              setMode("signin");
                              setFormError(null);
                            }}
                          >
                            Sign in
                          </button>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="mt-5 rounded-xl border border-dashed border-border bg-background/50 p-3.5">
                    <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Sparkles className="size-3 text-primary" />
                      Or step into a filled demo
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void enterDemo("student")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[0.72rem] font-medium transition-colors hover:border-primary/30 disabled:opacity-50"
                      >
                        {busy === "demo-student" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <GraduationCap className="size-3.5 text-primary" />
                        )}
                        Student demo
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void enterDemo("organization")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[0.72rem] font-medium transition-colors hover:border-primary/30 disabled:opacity-50"
                      >
                        {busy === "demo-org" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Building2 className="size-3.5 text-primary" />
                        )}
                        Startup demo
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {step === "code" ? (
                <>
                  <ProgressDots step={step} />
                  <h1 className="mt-5 font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em]">
                    Check your inbox.
                  </h1>
                  <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                    We sent a six-digit code to{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                    It expires in 15 minutes.
                  </p>

                  <form onSubmit={verifyCode} className="mt-7" noValidate>
                    <div className="flex justify-center">
                      <InputOTP
                        value={code}
                        onChange={setCode}
                        maxLength={6}
                        disabled={busy !== null}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && code.length === 6) {
                            event.currentTarget.closest("form")?.requestSubmit();
                          }
                        }}
                      >
                        <InputOTPGroup className="gap-2">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="size-11 rounded-lg border-border bg-background/70 text-base"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {formError ? (
                      <p className="mt-4 text-center text-xs font-medium text-destructive" role="alert">
                        {formError}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      className="mt-6 h-11 w-full gap-2 rounded-lg"
                      disabled={code.length !== 6 || busy !== null}
                    >
                      {busy === "verify" || busy === "finish" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {busy === "finish" ? "Setting up your workspace…" : "Verifying…"}
                        </>
                      ) : (
                        <>
                          Verify and continue
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>Didn't get it?</span>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void sendCode()}
                      className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Send a new code
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setFormError(null);
                    }}
                    className="mt-4 w-full text-center text-[0.7rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Use a different email
                  </button>
                </>
              ) : null}
            </div>

            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[0.66rem] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <LockKeyhole className="size-3" />
                Secure, passwordless sign-in
              </span>
              <span aria-hidden="true">·</span>
              <span>You keep the rights to your work</span>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function Auth() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <AuthPage />
    </Suspense>
  );
}
