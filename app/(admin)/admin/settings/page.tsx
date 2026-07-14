"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Landmark, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingRow {
  key: string;
  value: string;
  description: string;
}

const DEPOSIT_KEYS = ["DEPOSIT_BANK_NAME", "DEPOSIT_ACCOUNT_NUMBER", "DEPOSIT_ACCOUNT_NAME"];
const DEPOSIT_LABELS: Record<string, string> = {
  DEPOSIT_BANK_NAME: "Bank Name",
  DEPOSIT_ACCOUNT_NUMBER: "Account Number",
  DEPOSIT_ACCOUNT_NAME: "Account Holder Name",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = () =>
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((rows: SettingRow[]) => {
        setSettings(rows);
        setValues(Object.fromEntries(rows.map((r) => [r.key, r.value])));
      });

  useEffect(() => {
    load();
  }, []);

  const save = async (key: string) => {
    setSaving(key);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: values[key] ?? "" }),
    });
    setSaving(null);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Failed to save");
    toast.success("Setting saved.");
    load();
  };

  const depositSettings = settings.filter((s) => DEPOSIT_KEYS.includes(s.key));
  const otherSettings = settings.filter((s) => !DEPOSIT_KEYS.includes(s.key));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Platform configuration. Changes apply immediately.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Landmark className="size-4 text-primary" /> Deposit Bank Account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown to users on the Wallet page so they know where to send a manual deposit.
        </p>
        <div className="mt-4 space-y-4">
          {depositSettings.map((s) => (
            <div key={s.key} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={s.key}>{DEPOSIT_LABELS[s.key] ?? s.key}</Label>
                <Input
                  id={s.key}
                  value={values[s.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                  placeholder="Not set"
                />
              </div>
              <Button size="sm" disabled={saving === s.key} onClick={() => save(s.key)}>
                {saving === s.key ? "Saving..." : "Save"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="size-4 text-primary" /> Platform Rules
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Match economics, timers, and limits. Be careful — these affect every match created after you save.
        </p>
        <div className="mt-4 space-y-4">
          {otherSettings.map((s) => (
            <div key={s.key} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={s.key}>{s.key}</Label>
                <Input id={s.key} value={values[s.key] ?? ""} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })} />
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </div>
              <Button size="sm" variant="outline" disabled={saving === s.key} onClick={() => save(s.key)}>
                {saving === s.key ? "Saving..." : "Save"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
