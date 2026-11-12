import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/authz";
import { startOrganizationDemo, startStudentDemo } from "./lib/seedEngine";

/**
 * "Explore the demo" entrance. Only role-less accounts (the anonymous guest
 * session created for a demo) can claim a demo workspace, so a real signed-up
 * account can never be quietly seeded with demo data.
 */
export const start = mutation({
  args: { role: v.union(v.literal("student"), v.literal("organization")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role) {
      throw new ConvexError(
        "This account already has a role. Sign in with the right account.",
      );
    }
    if (args.role === "student") {
      return await startStudentDemo(ctx, user);
    }
    return await startOrganizationDemo(ctx, user);
  },
});
