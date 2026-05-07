import { db } from "@/db";
import { matches, matchRounds } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

/**
 * Плей-офф: прогрессия победителя (и проигравшего) в следующий раунд.
 * Вызывается после завершения плей-офф матча.
 */
export async function progressPlayoffWinner(match: typeof matches.$inferSelect) {
  if (!match.roundId || !match.stageId) return;

  const currentRound = await db.query.matchRounds.findFirst({
    where: eq(matchRounds.id, match.roundId),
  });
  if (!currentRound) return;

  // Все матчи текущего раунда, отсортированные по matchNumber
  const roundMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.roundId, match.roundId),
      eq(matches.stageId, match.stageId),
      isNull(matches.deletedAt),
    ),
    orderBy: [asc(matches.matchNumber)],
  });

  const position = roundMatches.findIndex((m) => m.id === match.id);
  if (position === -1) return;

  const winnerId = match.winnerId;
  const loserId = winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

  // ── Победитель → следующий раунд (финал) ─────────────────────────────────
  if (winnerId && currentRound.order > 1) {
    const nextRound = await db.query.matchRounds.findFirst({
      where: and(
        eq(matchRounds.stageId, currentRound.stageId),
        eq(matchRounds.order, currentRound.order - 1),
      ),
    });
    if (nextRound) {
      const nextRoundMatches = await db.query.matches.findMany({
        where: and(
          eq(matches.roundId, nextRound.id),
          eq(matches.stageId, match.stageId),
          isNull(matches.deletedAt),
        ),
        orderBy: [asc(matches.matchNumber)],
      });
      const targetIndex = Math.floor(position / 2);
      const targetMatch = nextRoundMatches[targetIndex];
      if (targetMatch) {
        const isHome = position % 2 === 0;
        await db
          .update(matches)
          .set(isHome ? { homeTeamId: winnerId } : { awayTeamId: winnerId })
          .where(eq(matches.id, targetMatch.id));
      }
    }
  }

  // ── Проигравший → матч за 3-е место (если hasThirdPlace на полуфинальном раунде) ──
  if (loserId && currentRound.hasThirdPlace) {
    const thirdPlaceMatches = await db.query.matches.findMany({
      where: and(
        eq(matches.roundId, currentRound.id),
        eq(matches.stageId, match.stageId),
        isNull(matches.deletedAt),
      ),
      orderBy: [asc(matches.matchNumber)],
    });
    // Матч за 3-е место = последний матч в раунде (после основных)
    const thirdMatch = thirdPlaceMatches[currentRound.matchCount];
    if (thirdMatch) {
      const isHome = position % 2 === 0;
      await db
        .update(matches)
        .set(isHome ? { homeTeamId: loserId } : { awayTeamId: loserId })
        .where(eq(matches.id, thirdMatch.id));
    }
  }
}
