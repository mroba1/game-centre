"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Upload, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKobo } from "@/lib/money";
import { cn } from "@/lib/utils";

interface WalletSummary {
  balanceKobo: string;
  lockedKobo: string;
  availableKobo: string;
}
interface Transaction {
  id: string;
  type: string;
  amountKobo: string;
  createdAt: string;
  reason: string | null;
}
interface Deposit {
  id: string;
  amountKobo: string;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  paymentReference: string;
  createdAt: string;
  rejectionReason: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit",
  DEPOSIT_REJECTED: "Deposit Rejected",
  STAKE_LOCKED: "Stake Locked",
  STAKE_REFUNDED: "Stake Refunded",
  PRIZE_WON: "Prize Won",
  PLATFORM_FEE: "Platform Fee",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
};

export default function WalletPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [w, t, d] = await Promise.all([
      fetch("/api/wallet").then((r) => r.json()),
      fetch("/api/wallet/transactions").then((r) => r.json()),
      fetch("/api/deposits").then((r) => r.json()),
    ]);
    setSummary(w);
    setTransactions(t);
    setDeposits(d);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only setStates inside its own async/await chain, not synchronously
    load();
  }, [load]);

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNaira: Number(amount), paymentReference: reference }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Could not submit deposit");
      return;
    }
    toast.success("Deposit submitted — an admin will review it shortly.");
    setAmount("");
    setReference("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="mt-1 text-muted-foreground">Manage deposits and track every transaction on your account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Available Balance" value={summary ? formatKobo(summary.balanceKobo) : "—"} accent="text-emerald-400" />
        <SummaryCard label="Locked in Matches" value={summary ? formatKobo(summary.lockedKobo) : "—"} accent="text-amber-400" />
        <SummaryCard label="Total" value={summary ? formatKobo(BigInt(summary.balanceKobo) + BigInt(summary.lockedKobo)) : "—"} accent="text-violet-300" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Download className="size-4 text-primary" /> Deposit Funds
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Transfer to our account, then submit your reference below. An admin manually verifies every deposit.
          </p>
          <form onSubmit={submitDeposit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input id="amount" type="number" min={100} required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reference">Payment Reference</Label>
              <Input id="reference" required placeholder="e.g. bank transfer narration" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Deposit"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Upload className="size-4" /> Withdraw
            </h3>
            <p className="text-sm text-muted-foreground">Withdrawals are coming soon.</p>
          </div>

          {deposits.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Your Deposits</h3>
              <div className="space-y-2">
                {deposits.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{formatKobo(d.amountKobo)}</p>
                      <p className="text-xs text-muted-foreground">{d.paymentReference}</p>
                    </div>
                    <DepositStatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Transaction History</h2>
          <div className="mt-4 space-y-1">
            {transactions.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
            {transactions.map((t) => {
              const amount = BigInt(t.amountKobo);
              return (
                <div key={t.id} className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{TYPE_LABEL[t.type] ?? t.type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={cn("font-semibold", amount >= 0n ? "text-emerald-400" : "text-destructive")}>
                    {amount >= 0n ? "+" : ""}
                    {formatKobo(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", accent)}>{value}</p>
    </div>
  );
}

function DepositStatusBadge({ status }: { status: Deposit["status"] }) {
  if (status === "COMPLETED")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="size-3.5" /> Completed
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
        <XCircle className="size-3.5" /> Rejected
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
      <Clock className="size-3.5" /> Pending
    </span>
  );
}
