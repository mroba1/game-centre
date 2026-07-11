"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Category {
  id: string;
  name: string;
}
interface Question {
  id: string;
  prompt: string;
  topic: string;
  difficulty: string;
  active: boolean;
  category: { name: string };
  options: Array<{ label: string; isCorrect: boolean }>;
}

export default function AdminQuestionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState({
    categoryId: "",
    topic: "",
    difficulty: "MEDIUM",
    prompt: "",
    explanation: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    fetch("/api/admin/categories").then((r) => r.json()).then((cats) => {
      setCategories(cats);
      setForm((f) => (f.categoryId ? f : { ...f, categoryId: cats[0]?.id ?? "" }));
    });
    fetch("/api/admin/questions").then((r) => r.json()).then(setQuestions);
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: form.categoryId,
        topic: form.topic,
        difficulty: form.difficulty,
        prompt: form.prompt,
        explanation: form.explanation || undefined,
        tags: [],
        options: form.options
          .filter((o) => o.trim())
          .map((label, i) => ({ label, isCorrect: i === form.correctIndex })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Failed to create question");
    toast.success("Question added to the bank.");
    setForm({ ...form, topic: "", prompt: "", explanation: "", options: ["", "", "", ""], correctIndex: 0 });
    load();
  };

  const retire = async (id: string) => {
    await fetch(`/api/admin/questions/${id}/retire`, { method: "POST" });
    toast.success("Question retired.");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Questions</h1>
        <p className="mt-1 text-muted-foreground">Manage the question bank powering every match.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Add Question</h2>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Topic</Label>
            <Input required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Prompt</Label>
            <Input required value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Explanation (optional)</Label>
            <Input value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Options (mark the correct one)</Label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" checked={form.correctIndex === i} onChange={() => setForm({ ...form, correctIndex: i })} />
                <Input
                  value={opt}
                  onChange={(e) => {
                    const options = [...form.options];
                    options[i] = e.target.value;
                    setForm({ ...form, options });
                  }}
                  placeholder={`Option ${i + 1}`}
                />
              </div>
            ))}
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Saving..." : "Add Question"}
          </Button>
        </form>

        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {q.category.name} · {q.topic} · {q.difficulty} {!q.active && "· Retired"}
                  </p>
                  <p className="mt-1 font-medium">{q.prompt}</p>
                  <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                    {q.options.map((o, i) => (
                      <li key={i} className={o.isCorrect ? "text-emerald-400" : ""}>
                        {o.isCorrect ? "✓ " : "· "}
                        {o.label}
                      </li>
                    ))}
                  </ul>
                </div>
                {q.active && (
                  <Button size="sm" variant="outline" onClick={() => retire(q.id)}>
                    Retire
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
