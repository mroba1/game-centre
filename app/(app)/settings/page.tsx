import { requireUser } from "@/lib/currentUser";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account preferences.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Account</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-muted-foreground">Password</span>
            <a href="/forgot-password" className="text-primary hover:underline">
              Reset password
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
        Two-factor authentication, device management, and notification preferences are coming soon.
      </div>
    </div>
  );
}
