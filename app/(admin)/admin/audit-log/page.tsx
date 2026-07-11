import { requireAdmin } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditLogPage() {
  await requireAdmin();

  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="mt-1 text-muted-foreground">Every admin action, permanently recorded and never editable.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border/60 last:border-0 align-top">
                <td className="px-4 py-3 font-medium">{log.actor.username}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{log.action}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {log.targetType}:{log.targetId.slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{log.reason ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.createdAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
