import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  getProfileForUser,
  requireOrganization,
  requireStudent,
  requireUser,
} from "./lib/authz";

const linkValidator = v.object({
  label: v.string(),
  url: v.string(),
});

const showcaseValidator = v.object({
  title: v.string(),
  description: v.string(),
  link: v.optional(v.string()),
});

function cleanList(values: string[] | undefined): string[] {
  if (!values) return [];
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .slice(0, 24),
    ),
  );
}

function cleanText(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

/** Everything the shell needs about the signed-in person. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const profiles = await getProfileForUser(ctx, user);
    return {
      user: {
        _id: user._id,
        name: user.name ?? "",
        email: user.email ?? "",
        role: user.role ?? null,
        isAnonymous: user.isAnonymous ?? false,
      },
      studentProfile: profiles.student,
      organizationProfile: profiles.organization,
    };
  },
});

/**
 * Called once after the person picks a role and signs in. The role is fixed at
 * this point — there is no self-service way to become an admin.
 */
export const completeOnboarding = mutation({
  args: {
    role: v.union(v.literal("student"), v.literal("organization")),
    fullName: v.optional(v.string()),
    headline: v.optional(v.string()),
    university: v.optional(v.string()),
    year: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    interests: v.optional(v.array(v.string())),
    domains: v.optional(v.array(v.string())),
    availability: v.optional(v.string()),
    links: v.optional(v.array(linkValidator)),
    showcase: v.optional(v.array(showcaseValidator)),
    companyName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    location: v.optional(v.string()),
    about: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (user.role === "admin") {
      throw new ConvexError("Admin accounts are managed separately.");
    }
    if (user.role && user.role !== args.role) {
      throw new ConvexError(
        "This account already has a different role. Please sign in with the right account.",
      );
    }

    if (args.role === "student") {
      const fullName = cleanText(args.fullName, 80);
      if (fullName.length < 2) {
        throw new ConvexError("Please add your full name.");
      }
      const existing = await ctx.db
        .query("studentProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      const profile = {
        fullName,
        headline: cleanText(args.headline, 120) || "Student building real things",
        university: cleanText(args.university, 120) || "Independent",
        year: cleanText(args.year, 40) || "Final year",
        bio: cleanText(args.bio, 800),
        skills: cleanList(args.skills),
        interests: cleanList(args.interests),
        domains: cleanList(args.domains),
        availability: cleanText(args.availability, 80) || "10–15 hrs / week",
        links: (args.links ?? []).slice(0, 6).map((link) => ({
          label: cleanText(link.label, 60) || "Link",
          url: cleanText(link.url, 300),
        })),
        showcase: (args.showcase ?? []).slice(0, 6).map((item) => ({
          title: cleanText(item.title, 120),
          description: cleanText(item.description, 400),
          link: item.link ? cleanText(item.link, 300) : undefined,
        })),
      };

      if (existing) {
        await ctx.db.patch(existing._id, profile);
      } else {
        await ctx.db.insert("studentProfiles", { userId: user._id, ...profile });
      }

      await ctx.db.patch(user._id, {
        role: "student",
        name: fullName,
        status: user.status ?? "active",
      });
      return { role: "student" as const };
    }

    const companyName = cleanText(args.companyName, 120);
    const contactName = cleanText(args.contactName, 80);
    if (companyName.length < 2) {
      throw new ConvexError("Please add your company name.");
    }
    if (contactName.length < 2) {
      throw new ConvexError("Please add a contact name.");
    }

    const existing = await ctx.db
      .query("organizationProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const profile = {
      companyName,
      contactName,
      website: args.website ? cleanText(args.website, 300) : undefined,
      industry: cleanText(args.industry, 80) || "Startup",
      companySize: cleanText(args.companySize, 40) || "1–10 people",
      location: cleanText(args.location, 120) || "India",
      about: cleanText(args.about, 1200),
      verified: existing?.verified ?? false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, profile);
    } else {
      await ctx.db.insert("organizationProfiles", {
        userId: user._id,
        ...profile,
      });
    }

    await ctx.db.patch(user._id, {
      role: "organization",
      name: companyName,
      status: user.status ?? "active",
    });
    return { role: "organization" as const };
  },
});

export const updateStudentProfile = mutation({
  args: {
    fullName: v.string(),
    headline: v.string(),
    university: v.string(),
    year: v.string(),
    bio: v.string(),
    skills: v.array(v.string()),
    interests: v.array(v.string()),
    domains: v.array(v.string()),
    availability: v.string(),
    links: v.array(linkValidator),
    showcase: v.array(showcaseValidator),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await requireStudent(ctx);
    const fullName = cleanText(args.fullName, 80);
    if (fullName.length < 2) throw new ConvexError("Please add your full name.");

    await ctx.db.patch(profile._id, {
      fullName,
      headline: cleanText(args.headline, 120),
      university: cleanText(args.university, 120),
      year: cleanText(args.year, 40),
      bio: cleanText(args.bio, 900),
      skills: cleanList(args.skills),
      interests: cleanList(args.interests),
      domains: cleanList(args.domains),
      availability: cleanText(args.availability, 80),
      links: args.links.slice(0, 6).map((link) => ({
        label: cleanText(link.label, 60) || "Link",
        url: cleanText(link.url, 300),
      })),
      showcase: args.showcase.slice(0, 6).map((item) => ({
        title: cleanText(item.title, 120),
        description: cleanText(item.description, 400),
        link: item.link ? cleanText(item.link, 300) : undefined,
      })),
    });
    await ctx.db.patch(user._id, { name: fullName });
    return { ok: true };
  },
});

export const updateOrganizationProfile = mutation({
  args: {
    companyName: v.string(),
    contactName: v.string(),
    website: v.optional(v.string()),
    industry: v.string(),
    companySize: v.string(),
    location: v.string(),
    about: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await requireOrganization(ctx);
    const companyName = cleanText(args.companyName, 120);
    if (companyName.length < 2) {
      throw new ConvexError("Please add your company name.");
    }
    await ctx.db.patch(profile._id, {
      companyName,
      contactName: cleanText(args.contactName, 80),
      website: args.website ? cleanText(args.website, 300) : undefined,
      industry: cleanText(args.industry, 80),
      companySize: cleanText(args.companySize, 40),
      location: cleanText(args.location, 120),
      about: cleanText(args.about, 1200),
    });
    await ctx.db.patch(user._id, { name: companyName });
    return { ok: true };
  },
});
