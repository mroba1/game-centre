import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Defense-in-depth re-check (see docs/architecture.md §2.1 layering note):
 * middleware already guards routes, but every server component/route handler
 * re-verifies rather than trusting the guard alone.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
