import Link from "next/link";
import { Code, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/currentUser";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { code: Code, shield: ShieldCheck };

export default async function CategoriesPage() {
  await requireUser();
  const categories = await prisma.category.findMany({
    where: { active: true },
    include: { _count: { select: { questions: true, games: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="mt-1 text-muted-foreground">Pick a category to see open matches or create your own.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const Icon = ICONS[c.icon] ?? Code;
          return (
            <Link
              key={c.id}
              href={`/active-games?categoryId=${c.id}`}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <p className="mt-4 font-semibold">{c.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c._count.questions} questions in bank</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
