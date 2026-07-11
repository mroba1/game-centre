import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

/**
 * Route-handler counterpart to lib/currentUser.ts's requireUser(). That
 * helper uses next/navigation's redirect(), which is for page rendering —
 * route handlers need a real 401/403 JSON response instead (see
 * lib/apiError.ts). Middleware already blocks unauthenticated API access;
 * this is the defense-in-depth re-check inside the handler itself.
 */
export async function requireApiUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

export async function requireApiAdmin() {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") throw new ForbiddenError();
  return user;
}
