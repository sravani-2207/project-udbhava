/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiEvaluation from "../aiEvaluation.js";
import type * as assignments from "../assignments.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as demo from "../demo.js";
import type * as gnani from "../gnani.js";
import type * as http from "../http.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_seedEngine from "../lib/seedEngine.js";
import type * as notifications from "../notifications.js";
import type * as opportunities from "../opportunities.js";
import type * as problems from "../problems.js";
import type * as profiles from "../profiles.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as services_aiAnalysis from "../services/aiAnalysis.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiEvaluation: typeof aiEvaluation;
  assignments: typeof assignments;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  demo: typeof demo;
  gnani: typeof gnani;
  http: typeof http;
  "lib/authz": typeof lib_authz;
  "lib/seedEngine": typeof lib_seedEngine;
  notifications: typeof notifications;
  opportunities: typeof opportunities;
  problems: typeof problems;
  profiles: typeof profiles;
  reviews: typeof reviews;
  seed: typeof seed;
  "services/aiAnalysis": typeof services_aiAnalysis;
  submissions: typeof submissions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
