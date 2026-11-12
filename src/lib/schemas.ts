import { z } from "zod";

export const studentOnboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Add your full name."),
  university: z.string().trim().min(2, "Add your university or school."),
  year: z.string().trim().min(1, "Choose where you are in your course."),
  headline: z.string().trim().min(3, "Add a one-line headline.").max(120),
  skills: z.string().trim().min(2, "List at least one skill."),
  domains: z.string().trim().min(2, "Pick at least one domain."),
  bio: z.string().trim().max(800, "Keep the bio under 800 characters."),
  availability: z.string().trim().min(1, "Choose your weekly availability."),
});

export const organizationOnboardingSchema = z.object({
  companyName: z.string().trim().min(2, "Add your company name."),
  contactName: z.string().trim().min(2, "Add a contact name."),
  industry: z.string().trim().min(2, "Add your industry."),
  companySize: z.string().trim().min(1, "Choose your team size."),
  location: z.string().trim().min(2, "Add your city."),
  website: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || /^https?:\/\/.+\..+/.test(value),
      "Include https:// in the website URL.",
    ),
  about: z.string().trim().max(1200, "Keep this under 1,200 characters."),
});

export const submissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give this version a title of at least 5 characters.")
    .max(140, "Keep the title under 140 characters."),
  approach: z
    .string()
    .trim()
    .min(80, "Write at least 80 characters so reviewers can follow the thinking.")
    .max(12000, "Keep the write-up under 12,000 characters."),
  repoUrl: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || /^https?:\/\/.+\..+/.test(value),
      "Include https:// in the repository URL.",
    ),
});
export type SubmissionValues = z.infer<typeof submissionSchema>;

export const problemSchema = z.object({
  title: z.string().trim().min(8, "Use at least 8 characters."),
  summary: z.string().trim().min(20, "Use at least 20 characters.").max(240),
  description: z.string().trim().min(80, "Give context in at least 80 characters."),
  domain: z.string().trim().min(2, "Add a domain."),
  skills: z.string().trim().min(2, "Add at least one skill."),
  difficulty: z.enum(["starter", "intermediate", "advanced"]),
  deadline: z.string().min(1, "Pick a deadline."),
  solutionCap: z.coerce
    .number()
    .min(1, "At least one solution.")
    .max(50, "The maximum cap is 50."),
});
export type ProblemValues = z.infer<typeof problemSchema>;

export const opportunitySchema = z.object({
  type: z.enum(["internship", "job", "project"]),
  title: z.string().trim().min(4, "Add a clear title.").max(120),
  message: z.string().trim().min(20, "Add a short note (20+ characters).").max(1500),
});
export type OpportunityValues = z.infer<typeof opportunitySchema>;
