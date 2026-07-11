"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);

  const load = () => fetch("/api/notifications").then((r) => r.json()).then(setItems);

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    load();
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Stay on top of match invites, deposits, and results.</p>
        </div>
        <Button variant="secondary" size="sm" className="gap-2" onClick={markAllRead}>
          <CheckCheck className="size-4" /> Mark all read
        </Button>
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Bell className="mx-auto mb-2 size-6" />
          You&apos;re all caught up.
        </div>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              n.read ? "border-border bg-card/60" : "border-primary/30 bg-primary/5"
            )}
          >
            {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-fuchsia-500" />}
            <div className={cn(n.read && "ml-5")}>
              <p className="font-medium">{n.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
