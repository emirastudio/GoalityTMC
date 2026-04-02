import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg, getOrgTournament } from "@/lib/tenant";
import { type TokenPayload } from "@/lib/auth";
import { type tournaments } from "@/db/schema";

export type GameContext = {
  session: TokenPayload;
  orgSlug: string;
  tournament: typeof tournaments.$inferSelect;
  organizationId: number;
};

/**
 * Единый хелпер авторизации для всех game logic роутов.
 * Проверяет сессию → org → tournament принадлежность.
 */
export async function requireGameAdmin(
  req: NextRequest,
  params: { orgSlug: string; tournamentId: string }
): Promise<GameContext | NextResponse> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { authorized, organization } = await authorizeOrg(session, params.orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tournament = await getOrgTournament(
    parseInt(params.tournamentId),
    organization.id
  );
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return {
    session,
    orgSlug: params.orgSlug,
    tournament,
    organizationId: organization.id,
  };
}

export function isError(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
