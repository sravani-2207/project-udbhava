import { LotusMark, Monogram } from "@/components/brand";
import { Eyebrow, PageHeading, StatCard } from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { organizationOnboardingSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import type { z } from "zod";

const sizes = ["1–10 people", "11–50 people", "51–200 people", "200+ people"];

type FormState = z.infer<typeof organizationOnboardingSchema>;

const emptyForm: FormState = {
  companyName: "",
  contactName: "",
  industry: "",
  companySize: "1–10 people",
  location: "",
  website: "",
  about: "",
};

export default function OrganizationProfile() {
  const me = useQuery(api.profiles.me);
  const overview = useQuery(api.problems.orgOverview);
  const updateProfile = useMutation(api.profiles.updateOrganizationProfile);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const profile = me?.organizationProfile ?? null;

  useEffect(() => {
    if (!profile) return;
    // Hydrate the editable form once the profile query resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      companyName: profile.companyName,
      contactName: profile.contactName,
      industry: profile.industry,
      companySize: profile.companySize,
      location: profile.location,
      website: profile.website ?? "",
      about: profile.about,
    });
  }, [profile]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaveError(null);
    const parsed = organizationOnboardingSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        companyName: parsed.data.companyName,
        contactName: parsed.data.contactName,
        website: parsed.data.website || undefined,
        industry: parsed.data.industry,
        companySize: parsed.data.companySize,
        location: parsed.data.location,
        about: parsed.data.about,
      });
      toast.success("Company profile saved.");
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      setSaveError(raw.replace(/^ConvexError:\s*/i, ""));
    } finally {
      setSaving(false);
    }
  }

  if (me === undefined) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skeleton-warm h-3 w-24 rounded-full" />
        <div className="skeleton-warm h-10 w-64 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="skeleton-warm h-[28rem] w-full rounded-2xl" />
          <div className="skeleton-warm h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const inputClass = "h-9 bg-background/70 shadow-none";

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Company profile"
        title="The team behind the briefs."
        description="Students see this alongside every problem you post. Small is a strength — say what you actually do and what it's like to work with you."
        actions={
          <Badge
            variant="outline"
            className="gap-1.5 border-border bg-card px-3 py-1.5 text-[0.68rem]"
          >
            {profile?.verified ? (
              <>
                <CheckCircle2 className="size-3.5 text-primary" />
                Verified startup
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-muted-foreground" />
                Verification pending
              </>
            )}
          </Badge>
        }
      />

      {overview && overview.stats.submissions > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Submissions received"
            value={overview.stats.submissions}
            hint="Across all versions"
            icon={Users}
          />
          <StatCard
            label="Shortlisted"
            value={overview.stats.shortlisted}
            hint="Students notified"
            icon={Check}
          />
          <StatCard
            label="Opportunities"
            value={overview.stats.opportunities}
            hint={`${overview.stats.accepted} accepted`}
            icon={ArrowUpRight}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <form onSubmit={save} className="space-y-5" noValidate>
          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <Eyebrow>Basics</Eyebrow>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company name" htmlFor="companyName" error={errors.companyName}>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={(event) => update("companyName", event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Contact name" htmlFor="contactName" error={errors.contactName}>
                  <Input
                    id="contactName"
                    value={form.contactName}
                    onChange={(event) => update("contactName", event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Industry" htmlFor="industry" error={errors.industry}>
                  <Input
                    id="industry"
                    value={form.industry}
                    onChange={(event) => update("industry", event.target.value)}
                    className={inputClass}
                    placeholder="D2C kitchenware"
                  />
                </Field>
                <Field label="Team size" htmlFor="companySize" error={errors.companySize}>
                  <select
                    id="companySize"
                    value={form.companySize}
                    onChange={(event) => update("companySize", event.target.value)}
                    className={cn(inputClass, "w-full rounded-md border px-3 text-sm")}
                  >
                    {sizes.map((size) => (
                      <option key={size}>{size}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City" htmlFor="location" error={errors.location}>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(event) => update("location", event.target.value)}
                    className={inputClass}
                    placeholder="Bengaluru"
                  />
                </Field>
                <Field label="Website" htmlFor="website" error={errors.website} hint="optional">
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(event) => update("website", event.target.value)}
                    className={inputClass}
                    placeholder="https://"
                  />
                </Field>
              </div>

              <Field label="What does your team do?" htmlFor="about" error={errors.about}>
                <Textarea
                  id="about"
                  value={form.about}
                  onChange={(event) => update("about", event.target.value)}
                  rows={5}
                  className="resize-y bg-background/70 text-sm leading-6 shadow-none"
                  placeholder="We make small-batch kitchenware for Indian homes and ship 4,000 orders a month…"
                  maxLength={1200}
                />
              </Field>
            </div>
          </section>

          {saveError ? (
            <p
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              {saveError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.68rem] text-muted-foreground">
              Changes show on every published problem.
            </p>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Save company profile
            </Button>
          </div>
        </form>

        <aside className="lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card soft-card">
            <div className="paper-wash relative border-b border-border/60 px-5 pb-5 pt-6">
              <LotusMark className="absolute right-4 top-4 h-9 w-auto text-primary/15" />
              <Badge
                variant="outline"
                className="border-border/70 bg-card/80 text-[0.6rem] uppercase tracking-[0.12em] text-primary"
              >
                Public company card
              </Badge>
              <div className="mt-5 flex items-end gap-3">
                <Monogram
                  name={form.companyName || "Your company"}
                  className="size-14 rounded-2xl text-base"
                />
                <div className="min-w-0 pb-0.5">
                  <p className="truncate font-display text-[1.55rem] font-semibold leading-tight">
                    {form.companyName || "Your company"}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                    {form.industry || "Industry"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.68rem] text-muted-foreground">
                {form.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {form.location}
                  </span>
                ) : null}
                {form.companySize ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    {form.companySize}
                  </span>
                ) : null}
                {form.website ? (
                  <a
                    href={form.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    <Globe className="size-3" />
                    Website
                  </a>
                ) : null}
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <p className="text-[0.78rem] leading-6 text-foreground/75">
                {form.about ||
                  "A short, specific description of what your team does helps students decide whether the brief fits them."}
              </p>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                <p className="flex items-start gap-2 text-[0.68rem] leading-4 text-muted-foreground">
                  <Building2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  {form.contactName
                    ? `${form.contactName} is the contact for student questions and opportunities.`
                    : "Add a contact name so students know who they're talking to."}
                </p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 rounded-2xl border border-border/60 bg-card/50 p-4"
          >
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Why this matters
            </p>
            <p className="mt-2 text-[0.7rem] leading-5 text-muted-foreground">
              The best submissions come from students who understand the context.
              A clear company card makes an honest brief easier to write — and
              easier to trust.
            </p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-3 h-7 gap-1 px-0 text-[0.7rem] text-primary hover:bg-transparent hover:text-primary/80"
            >
              <Link to="/org/problems/new">
                Post a problem
                <ArrowUpRight className="size-3" />
              </Link>
            </Button>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between gap-2 text-xs font-medium text-foreground/85"
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
