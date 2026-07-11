import { prisma } from "@/lib/prisma";
import { emitUserEvent } from "@/lib/realtime";

export async function notifyUser(params: { userId: string; type: string; title: string; body: string }) {
  const notification = await prisma.notification.create({
    data: { userId: params.userId, type: params.type, title: params.title, body: params.body },
  });
  await emitUserEvent(params.userId, "notification", notification);
  return notification;
}

export async function listNotifications(userId: string, take = 30) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { read: true } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
