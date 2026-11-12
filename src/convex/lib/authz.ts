import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type AppCtx = QueryCtx | MutationCtx;

/** The signed-in, non-suspended user, or null. */
export async function getCurrentUser(
  ctx: AppCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const user = await ctx.db.get(userId);
  if (!user || user.status === "suspended") return null;
  return user;
}

export async function requireUser(ctx: AppCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError("Please sign in to continue.");
  }
  return user;
}

export async function requireStudent(ctx: AppCtx): Promise<{
  user: Doc<"users">;
  profile: Doc<"studentProfiles">;
}> {
  const user = await requireUser(ctx);
  if (user.role !== "student") {
    throw new ConvexError("This action is only available to students.");
  }
  const profile = await ctx.db
    .query("studentProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!profile) {
    throw new ConvexError("Finish your student profile first.");
  }
  return { user, profile };
}

export async function requireOrganization(ctx: AppCtx): Promise<{
  user: Doc<"users">;
  profile: Doc<"organizationProfiles">;
}> {
  const user = await requireUser(ctx);
  if (user.role !== "organization") {
    throw new ConvexError("This action is only available to organizations.");
  }
  const profile = await ctx.db
    .query("organizationProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!profile) {
    throw new ConvexError("Finish your organization profile first.");
  }
  return { user, profile };
}

export async function requireOwnedProblem(
  ctx: AppCtx,
  problemId: Id<"problems">,
  orgId: Id<"users">,
): Promise<Doc<"problems">> {
  const problem = await ctx.db.get(problemId);
  if (!problem) throw new ConvexError("That problem no longer exists.");
  if (problem.orgId !== orgId) {
    throw new ConvexError("You can only manage your own problems.");
  }
  return problem;
}

export async function getProfileForUser(
  ctx: AppCtx,
  user: Doc<"users">,
): Promise<{
  student: Doc<"studentProfiles"> | null;
  organization: Doc<"organizationProfiles"> | null;
}> {
  if (user.role === "student") {
    const student = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return { student, organization: null };
  }
  if (user.role === "organization") {
    const organization = await ctx.db
      .query("organizationProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return { student: null, organization };
  }
  return { student: null, organization: null };
}
