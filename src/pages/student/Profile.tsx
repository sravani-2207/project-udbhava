import { LotusMark, Monogram } from "@/components/brand";
import { EmptyState } from "@/components/shared/state-views";
import { Eyebrow, PageHeading } from "@/components/shared/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { initials, splitCommaList } from "@/lib/format";
import { studentOnboardingSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { toast } from "sonner";
import type { z } from "zod";

type LinkDraft = { label: string; url: string };
type ShowcaseDraft = { title: string; description: string; link: string };

const years = ["First year", "Second year", "Third year", "Final year", "Graduated"];
const availabilities = [
  "5–10 hrs / week",
  "10–15 hrs / week",
  "15–20 hrs / week",
  "20+ hrs / week",
];

export default function StudentProfile() {
  const { user } = useAuth();
  const me = useQuery(api.profiles.me);
  const updateProfile = useMutation(api.profiles.updateStudentProfile);
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseDraft[]>([]);
  const [interests, setInterests] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const profile = me?.studentProfile ?? null;

  const form = useForm<z.infer<typeof studentOnboardingSchema>>({
    resolver: zodResolver(studentOnboardingSchema),
    defaultValues: {
      fullName: "",
      university: "",
      year: "Final year",
      headline: "",
      skills: "",
      domains: "",
      bio: "",
      availability: "10–15 hrs / week",
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      fullName: profile.fullName,
      university: profile.university,
      year: profile.year,
      headline: profile.headline,
      skills: profile.skills.join(", "),
      domains: profile.domains.join(", "),
      bio: profile.bio,
      availability: profile.availability,
    });
    setInterests(profile.interests.join(", "));
    setLinks(profile.links.map((link) => ({ label: link.label, url: link.url })));
    setShowcase(
      profile.showcase.map((item) => ({
        title: item.title,
        description: item.description,
        link: item.link ?? "",
      })),
    );
  }, [profile, form]);

  const watched = form.watch();

  const preview = useMemo(
    () => ({
      fullName: watched.fullName || profile?.fullName || user?.name || "Your name",
      headline: watched.headline || profile?.headline || "Student building real things",
      university: watched.university || profile?.university || "Your university",
      year: watched.year || profile?.year || "",
      availability: watched.availability || profile?.availability || "",
      bio: watched.bio || profile?.bio || "",
      skills: splitCommaList(watched.skills),
      domains: splitCommaList(watched.domains),
    }),
    [watched, profile, user?.name],
  );

  const completeness = useMemo(() => {
    const checks = [
      preview.fullName.length > 1,
      preview.headline.length > 2,
      preview.university.length > 1,
      preview.bio.length > 20,
      preview.skills.length >= 2,
      preview.domains.length >= 1,
      links.some((link) => link.url),
      showcase.some((item) => item.title && item.description),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [preview, links, showcase]);

  if (me === undefined) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skeleton-warm h-3 w-24 rounded-full" />
        <div className="skeleton-warm h-10 w-64 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <div className="skeleton-warm h-72 w-full rounded-2xl" />
            <div className="skeleton-warm h-56 w-full rounded-2xl" />
          </div>
          <div className="skeleton-warm h-[28rem] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={UserRound}
        title="Finish setting up your profile"
        description="Your role is set, but the student profile is missing. Complete the short onboarding to unlock the board."
        action={
          <Button asChild>
            <Link to="/auth?onboarding=1">Complete onboarding</Link>
          </Button>
        }
      />
    );
  }

  async function onSubmit(values: z.infer<typeof studentOnboardingSchema>) {
    setSaveError(null);
    const cleanLinks = links
      .filter((link) => link.label.trim() || link.url.trim())
      .map((link) => ({ label: link.label.trim() || "Link", url: link.url.trim() }));
    if (cleanLinks.some((link) => !/^https?:\/\/.+\..+/.test(link.url))) {
      setSaveError("Every link needs a full https:// address.");
      return;
    }
    const cleanShowcase = showcase
      .filter((item) => item.title.trim() || item.description.trim())
      .map((item) => ({
        title: item.title.trim(),
        description: item.description.trim(),
        link: item.link.trim() || undefined,
      }))
      .filter((item) => item.title && item.description);
    if (cleanShowcase.some((item) => item.link && !/^https?:\/\/.+\..+/.test(item.link))) {
      setSaveError("Showcase links need a full https:// address.");
      return;
    }

    try {
      await updateProfile({
        fullName: values.fullName,
        headline: values.headline,
        university: values.university,
        year: values.year,
        bio: values.bio,
        skills: splitCommaList(values.skills),
        interests: splitCommaList(interests),
        domains: splitCommaList(values.domains),
        availability: values.availability,
        links: cleanLinks,
        showcase: cleanShowcase,
      });
      toast.success("Profile saved.", {
        description: "Your problems board will re-rank with the new details.",
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      setSaveError(raw.replace(/^ConvexError:\s*/i, ""));
    }
  }

  const inputClass = "h-9 bg-background/70 shadow-none";

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Your profile"
        title="The person behind the work."
        description="Startups see this next to every submission. Keep it specific, current, and honest about what you can take on."
        actions={
          <Badge
            variant="outline"
            className="gap-1.5 border-border bg-card px-3 py-1.5 text-[0.68rem]"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            {completeness}% complete
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] lg:items-start">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <Eyebrow>Basics</Eyebrow>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Full name</FormLabel>
                        <FormControl>
                          <Input {...field} className={inputClass} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="headline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Headline</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className={inputClass}
                            placeholder="Service designer who prototypes in the field"
                            maxLength={120}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="university"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">University / school</FormLabel>
                        <FormControl>
                          <Input {...field} className={inputClass} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Year</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className={cn(inputClass, "w-full rounded-md border px-3 text-sm")}
                          >
                            {years.map((year) => (
                              <option key={year}>{year}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Weekly availability</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className={cn(inputClass, "w-full rounded-md border px-3 text-sm")}
                        >
                          {availabilities.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <Eyebrow>Skills & interests</Eyebrow>
              <div className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-baseline justify-between text-xs">
                        <span>Skills</span>
                        <span className="text-[0.65rem] font-normal text-muted-foreground">
                          comma separated · drives your ranking
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={inputClass}
                          placeholder="User Research, Figma, Prototyping"
                        />
                      </FormControl>
                      <div className="mt-2 flex flex-wrap gap-1.5">
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

                <FormField
                  control={form.control}
                  name="domains"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-baseline justify-between text-xs">
                        <span>Domains</span>
                        <span className="text-[0.65rem] font-normal text-muted-foreground">
                          where you want to work
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={inputClass}
                          placeholder="Product & Service Design, Sustainability"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <label htmlFor="interests" className="flex items-baseline justify-between text-xs font-medium">
                    <span>Interests</span>
                    <span className="text-[0.65rem] font-normal text-muted-foreground">
                      optional colour for your ranking
                    </span>
                  </label>
                  <Input
                    id="interests"
                    value={interests}
                    onChange={(event) => setInterests(event.target.value)}
                    className={inputClass}
                    placeholder="Public health, Accessibility, Circular economy"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          className="resize-y bg-background/70 text-[0.85rem] leading-6 shadow-none"
                          placeholder="What kind of problems do you gravitate toward? What do you want to get better at?"
                          maxLength={800}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>Links</Eyebrow>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[0.7rem]"
                  onClick={() => setLinks((current) => [...current, { label: "", url: "" }])}
                >
                  <Plus className="size-3" />
                  Add link
                </Button>
              </div>
              {links.length === 0 ? (
                <p className="mt-3 text-[0.75rem] text-muted-foreground">
                  Add a portfolio, GitHub, LinkedIn, or anything that shows your
                  work.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {links.map((link, index) => (
                    <div key={index} className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={link.label}
                        onChange={(event) =>
                          setLinks((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, label: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Portfolio"
                        aria-label={`Link ${index + 1} label`}
                        className="h-9 bg-background/70 text-xs shadow-none sm:w-36"
                      />
                      <Input
                        value={link.url}
                        onChange={(event) =>
                          setLinks((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, url: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="https://"
                        aria-label={`Link ${index + 1} URL`}
                        className="h-9 flex-1 bg-background/70 text-xs shadow-none"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove link"
                        onClick={() =>
                          setLinks((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Eyebrow>Showcase</Eyebrow>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">
                    Two or three pieces of work tell a better story than a list.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-[0.7rem]"
                  onClick={() =>
                    setShowcase((current) => [
                      ...current,
                      { title: "", description: "", link: "" },
                    ])
                  }
                >
                  <Plus className="size-3" />
                  Add work
                </Button>
              </div>

              {showcase.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-4 text-[0.75rem] text-muted-foreground">
                  Nothing here yet. Add a project you're proud of — a course
                  project counts.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {showcase.map((item, index) => (
                    <div
                      key={index}
                      className="space-y-2 rounded-xl border border-border/70 bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Work {index + 1}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove showcase item"
                          onClick={() =>
                            setShowcase((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                      <Input
                        value={item.title}
                        onChange={(event) =>
                          setShowcase((current) =>
                            current.map((entry, itemIndex) =>
                              itemIndex === index
                                ? { ...entry, title: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        placeholder="Project title"
                        aria-label={`Showcase ${index + 1} title`}
                        className="h-9 bg-card text-xs shadow-none"
                      />
                      <Textarea
                        value={item.description}
                        onChange={(event) =>
                          setShowcase((current) =>
                            current.map((entry, itemIndex) =>
                              itemIndex === index
                                ? { ...entry, description: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        placeholder="What was the problem, what did you do, and what happened?"
                        aria-label={`Showcase ${index + 1} description`}
                        rows={3}
                        className="resize-y bg-card text-xs shadow-none"
                        maxLength={400}
                      />
                      <Input
                        value={item.link}
                        onChange={(event) =>
                          setShowcase((current) =>
                            current.map((entry, itemIndex) =>
                              itemIndex === index
                                ? { ...entry, link: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        placeholder="https:// link (optional)"
                        aria-label={`Showcase ${index + 1} link`}
                        className="h-9 bg-card text-xs shadow-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {saveError ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.68rem] text-muted-foreground">
                Changes affect how your board is ranked — immediately.
              </p>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="gap-2"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Save profile
              </Button>
            </div>
          </form>
        </Form>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card soft-card">
            <div className="paper-wash relative border-b border-border/60 px-5 pb-5 pt-6">
              <LotusMark className="absolute right-4 top-4 h-9 w-auto text-primary/15" />
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-primary">
                <Sparkles className="size-2.5" />
                Public profile
              </span>
              <div className="mt-5 flex items-end gap-3">
                <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-secondary font-display text-lg font-semibold text-primary">
                  {initials(preview.fullName)}
                </span>
                <div className="min-w-0 pb-0.5">
                  <p className="truncate font-display text-[1.55rem] font-semibold leading-tight">
                    {preview.fullName}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                    {preview.university}
                    {preview.year ? ` · ${preview.year}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[0.8rem] leading-5 text-foreground/80">
                {preview.headline}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Looking for briefs
                </span>
                {preview.availability ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{preview.availability}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              {preview.bio ? (
                <p className="text-[0.78rem] leading-6 text-foreground/75">
                  {preview.bio}
                </p>
              ) : (
                <p className="text-[0.78rem] italic leading-6 text-muted-foreground">
                  Your bio will appear here.
                </p>
              )}

              {preview.skills.length > 0 ? (
                <div>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Skills
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {preview.skills.slice(0, 10).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-border/80 bg-background px-2 py-0.5 text-[0.66rem]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {preview.domains.length > 0 ? (
                <div>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Domains
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {preview.domains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded-full bg-accent/25 px-2 py-0.5 text-[0.66rem] text-primary"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Showcase
                </p>
                {showcase.filter((item) => item.title).length === 0 ? (
                  <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-3 text-[0.7rem] leading-4 text-muted-foreground">
                    Work you add here appears with your profile.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2.5">
                    {showcase
                      .filter((item) => item.title)
                      .slice(0, 3)
                      .map((item, index) => (
                        <li
                          key={`${item.title}-${index}`}
                          className="rounded-lg border border-border/60 bg-background/50 p-2.5"
                        >
                          <p className="text-[0.75rem] font-medium">
                            {item.title}
                          </p>
                          {item.description ? (
                            <p className="mt-0.5 line-clamp-3 text-[0.68rem] leading-5 text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[0.65rem] text-primary underline-offset-4 hover:underline"
                            >
                              View work
                              <ExternalLink className="size-2.5" />
                            </a>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {links.filter((link) => link.url).length > 0 ? (
                <div className="flex flex-wrap gap-3 border-t border-border/60 pt-4">
                  {links
                    .filter((link) => link.url)
                    .map((link, index) => (
                      <a
                        key={`${link.url}-${index}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[0.68rem] font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {link.label ? (
                          <Link2 className="size-3" />
                        ) : (
                          <Globe className="size-3" />
                        )}
                        {link.label || "Link"}
                        <ArrowUpRight className="size-2.5" />
                      </a>
                    ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Profile strength
              </p>
              <span className="text-[0.68rem] font-medium tabular-nums text-primary">
                {completeness}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(3, completeness)}%` }}
              />
            </div>
            <p className="mt-2 text-[0.68rem] leading-4 text-muted-foreground">
              {completeness >= 80
                ? "Strong. Startups can see what you bring before they read a submission."
                : "Add a showcase piece and a link to give reviewers context beyond your skills."}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 p-4">
            <div className="flex items-center gap-2">
              <Monogram name={preview.fullName} className="size-8 rounded-lg text-[0.6rem]" />
              <p className="text-[0.68rem] leading-4 text-muted-foreground">
                This is how reviewers see you.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[0.68rem]">
              <Link to="/student">
                Board
                <ArrowUpRight className="size-3" />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
