import { internalMutation } from "./_generated/server";
import { ensureSeed } from "./lib/seedEngine";

/**
 * Idempotent demo seed.
 *
 * Run against the dev deployment with:
 *   bunx convex run seed:run
 *
 * Creates four startups, four students, six problems (including multi-phase and
 * a capped problem), versioned submissions, AI feedback, shortlists, offers,
 * and notifications. Safe to run more than once.
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ensureSeed(ctx);
    return { ok: true as const };
  },
});
