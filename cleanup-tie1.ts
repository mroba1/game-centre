import { prisma } from "./lib/prisma";
async function main() {
  const gameId = "cmrjp1fh6000djm04zv31moe7";
  const userIds = ["cmrjoyn0d0000l404ihjf8vu6", "cmrjoyokk0002l404zkhbyfwd"];
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (game) {
    await prisma.gameAnswer.deleteMany({ where: { gamePlayer: { gameId } } });
    await prisma.gameQuestion.deleteMany({ where: { gameId } });
    await prisma.gameEvent.deleteMany({ where: { gameId } });
    await prisma.platformRevenue.deleteMany({ where: { gameId } });
    await prisma.walletTransaction.deleteMany({ where: { relatedGameId: gameId } });
    await prisma.gamePlayer.deleteMany({ where: { gameId } });
    await prisma.game.delete({ where: { id: gameId } });
  }
  for (const userId of userIds) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) continue;
    await prisma.walletTransaction.deleteMany({ where: { wallet: { userId } } });
    await prisma.deposit.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  console.log("cleaned up round 1 tiebreak test");
}
main().finally(() => prisma.$disconnect());
