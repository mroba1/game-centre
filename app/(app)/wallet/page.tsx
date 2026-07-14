"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Upload, Clock, CheckCircle2, XCircle, Landmark, ImagePlus, X } from "lucide-react";
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
  receiptUrl: string | null;
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

interface DepositInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function WalletPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [w, t, d, info] = await Promise.all([
      fetch("/api/wallet").then((r) => r.json()),
      fetch("/api/wallet/transactions").then((r) => r.json()),
      fetch("/api/deposits").then((r) => r.json()),
      fetch("/api/deposit-info").then((r) => r.json()),
    ]);
    setSummary(w);
    setTransactions(t);
    setDeposits(d);
    setDepositInfo(info);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only setStates inside its own async/await chain, not synchronously
    load();
  }, [load]);

  const onReceiptSelected = (file: File | null) => {
    setReceiptFile(file);
    setReceiptPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile) {
      toast.error("Please attach a screenshot or photo of your payment receipt.");
      return;
    }
    setSubmitting(true);

    const uploadForm = new FormData();
    uploadForm.append("file", receiptFile);
    const uploadRes = await fetch("/api/deposits/upload-receipt", { method: "POST", body: uploadForm });
    if (!uploadRes.ok) {
      setSubmitting(false);
      const body = await uploadRes.json().catch(() => ({}));
      toast.error(body.error ?? "Could not upload receipt");
      return;
    }
    const { url: receiptUrl } = await uploadRes.json();

    const res = await fetch("/api/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNaira: Number(amount), paymentReference: reference, receiptUrl }),
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
    onReceiptSelected(null);
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
            Transfer to the account below, then submit your reference here. An admin manually verifies every deposit.
          </p>

          {depositInfo && (depositInfo.bankName || depositInfo.accountNumber) ? (
            <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Landmark className="size-4" /> Send to this account
              </div>
              {depositInfo.bankName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">{depositInfo.bankName}</span>
                </div>
              )}
              {depositInfo.accountNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-mono font-medium">{depositInfo.accountNumber}</span>
                </div>
              )}
              {depositInfo.accountName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name</span>
                  <span className="font-medium">{depositInfo.accountName}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Deposit account details haven&apos;t been set up yet — contact an admin before sending a transfer.
            </p>
          )}

          <form onSubmit={submitDeposit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input id="amount" type="number" min={100} required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reference">Payment Reference</Label>
              <Input id="reference" required placeholder="e.g. bank transfer narration" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receipt">Receipt Screenshot</Label>
              {receiptPreview ? (
                <div className="relative w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-selected local file preview, not a Next-optimizable remote asset */}
                  <img src={receiptPreview} alt="Receipt preview" className="h-32 rounded-lg border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => onReceiptSelected(null)}
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    aria-label="Remove receipt"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="receipt"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground hover:bg-muted/40"
                >
                  <ImagePlus className="size-4" />
                  Upload a screenshot or photo of your payment receipt
                </label>
              )}
              <input
                id="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={(e) => onReceiptSelected(e.target.files?.[0] ?? null)}
              />
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
                      {d.receiptUrl && (
                        <a href={d.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                          View receipt
                        </a>
                      )}
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
