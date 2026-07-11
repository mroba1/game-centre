import { Difficulty } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/modules/audit/application/auditLog";

export async function listCategories(activeOnly = false) {
  return prisma.category.findMany({ where: activeOnly ? { active: true } : {}, orderBy: { name: "asc" } });
}

export async function createCategory(params: { name: string; icon: string }) {
  return prisma.category.create({ data: params });
}

export async function listQuestions(params: { categoryId?: string; activeOnly?: boolean } = {}) {
  return prisma.question.findMany({
    where: {
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.activeOnly ? { active: true } : {}),
    },
    include: { options: true, category: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface UpsertQuestionInput {
  id?: string;
  categoryId: string;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  explanation?: string;
  tags: string[];
  options: Array<{ label: string; isCorrect: boolean }>;
}

export async function createQuestion(input: UpsertQuestionInput, adminId: string) {
  if (input.options.filter((o) => o.isCorrect).length !== 1) {
    throw new Error("A question must have exactly one correct option");
  }

  const question = await prisma.question.create({
    data: {
      categoryId: input.categoryId,
      topic: input.topic,
      difficulty: input.difficulty,
      prompt: input.prompt,
      explanation: input.explanation,
      tags: input.tags,
      options: { create: input.options.map((o, i) => ({ ...o, sortOrder: i })) },
    },
  });

  await recordAuditLog({ actorUserId: adminId, action: "QUESTION_CREATED", targetType: "Question", targetId: question.id });
  return question;
}

/** Soft delete only — a retired question is never hard-deleted so past GameQuestion references stay intact for audits. */
export async function retireQuestion(questionId: string, adminId: string) {
  const question = await prisma.question.update({ where: { id: questionId }, data: { active: false } });
  await recordAuditLog({ actorUserId: adminId, action: "QUESTION_RETIRED", targetType: "Question", targetId: questionId });
  return question;
}
