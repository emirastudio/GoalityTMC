import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, tournamentRegistrations, people, tournamentClasses, tournaments, organizations } from "@/db/schema";
import { eq, and, count, max } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getEffectivePlan, PLAN_LIMITS, TournamentPlan } from "@/lib/plan-gates";

// GET /api/clubs/[clubId]/teams
// Возвращает все команды клуба с данными их регистраций.
// Каждая команда имеет постоянную идентичность (birthYear + gender).
// Если в сессии есть tournamentId — добавляет данные регистрации в этот турнир.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);

  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Глобальные команды клуба с историей регистраций
  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, cid),
    orderBy: (t, { asc, desc }) => [desc(t.birthYear), asc(t.gender), asc(t.createdAt)],
    with: {
      registrations: {
        with: {
          class: true,
          // Include tournament info for history
        },
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      },
    },
  });

  // Обогащаем данными: счёт игроков + регистрация в текущем турнире
  const result = await Promise.all(
    clubTeams.map(async (team) => {
      const [playerCount] = await db
        .select({ count: count() })
        .from(people)
        .where(and(eq(people.teamId, team.id), eq(people.personType, "player")));

      const [staffCount] = await db
        .select({ count: count() })
        .from(people)
        .where(and(eq(people.teamId, team.id), eq(people.personType, "staff")));

      // Регистрация в текущем турнире (все записи — бывает несколько составов)
      const currentRegs = session.tournamentId
        ? team.registrations.filter((r) => r.tournamentId === session.tournamentId)
        : [];
      // Для совместимости: первая регистрация как "основная"
      const currentReg = currentRegs[0] ?? null;

      // Вычисляемое название команды: приоритет displayName (если один состав),
      // затем team.name, затем автоматически из birthYear + gender
      const derivedName = team.name
        ?? (team.birthYear ? `${team.birthYear}` : null)
        ?? null;

      return {
        id: team.id,
        clubId: team.clubId,
        name: team.name,
        birthYear: team.birthYear,
        gender: team.gender,
        derivedName,        // для отображения если нет кастомного имени
        createdAt: team.createdAt,
        // Данные текущей регистрации (турнирно-специфичные)
        registrationId: currentReg?.id ?? null,
        classId: currentReg?.classId ?? null,
        className: currentReg?.class?.name ?? "",
        regNumber: currentReg?.regNumber ?? null,
        status: currentReg?.status ?? null,
        squadAlias: currentReg?.squadAlias ?? null,
        displayName: currentReg?.displayName ?? null,
        // Все составы в текущем турнире
        currentSquads: currentRegs.map((r) => ({
          registrationId: r.id,
          squadAlias: r.squadAlias,
          displayName: r.displayName,
          classId: r.classId,
          className: r.class?.name ?? "",
          regNumber: r.regNumber,
          status: r.status,
        })),
        // Краткая история: в скольких турнирах участвовала
        totalTournaments: team.registrations
          .map((r) => r.tournamentId)
          .filter((v, i, a) => a.indexOf(v) === i).length,
        playersCount: Number(playerCount?.count ?? 0),
        staffCount: Number(staffCount?.count ?? 0),
      };
    })
  );

  return NextResponse.json(result);
}

// POST /api/clubs/[clubId]/teams
// Создаёт новую постоянную команду клуба (без регистрации в турнире).
// Для регистрации на турнир используй /tournament-register.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);

  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    birthYear,
    gender = "male",
    // Legacy: если передан classId + tournamentId — создаём и регистрируем
    classId,
    tournamentId: bodyTournamentId,
  } = body;

  // 1. Создаём постоянную команду
  const [team] = await db
    .insert(teams)
    .values({
      clubId: cid,
      name: name ?? null,
      birthYear: birthYear ? parseInt(birthYear) : null,
      gender: gender as "male" | "female" | "mixed",
    })
    .returning();

  // 2. Если передан tournamentId — создаём регистрацию (legacy совместимость)
  const tournamentId = bodyTournamentId ?? session.tournamentId;
  if (tournamentId) {
    // Check team limit
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });
    if (tournament) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, tournament.organizationId),
      });
      const effectivePlan = getEffectivePlan(tournament.plan as TournamentPlan, org?.eliteSubStatus);
      const extraTeamsPurchased = tournament.extraTeamsPurchased ?? 0;
      const [currentCountRow] = await db
        .select({ count: count() })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, tournamentId));
      const currentCount = Number(currentCountRow?.count ?? 0);
      const maxAllowed = PLAN_LIMITS[effectivePlan].maxTeams + extraTeamsPurchased;
      if (currentCount >= maxAllowed) {
        return NextResponse.json({
          error: `Team limit reached. Plan allows ${maxAllowed} teams.`,
          code: "TEAM_LIMIT",
          currentPlan: effectivePlan,
          maxTeams: maxAllowed,
          currentTeams: currentCount,
        }, { status: 402 });
      }
    }

    const [maxReg] = await db
      .select({ maxReg: max(tournamentRegistrations.regNumber) })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId));
    const nextRegNumber = (maxReg?.maxReg ?? 10000) + 1;

    const [registration] = await db
      .insert(tournamentRegistrations)
      .values({
        teamId: team.id,
        tournamentId,
        classId: classId ? parseInt(classId) : null,
        regNumber: nextRegNumber,
        status: "open",
        squadAlias: "",
        displayName: null,
      })
      .returning();

    return NextResponse.json({ team, registration }, { status: 201 });
  }

  return NextResponse.json({ team }, { status: 201 });
}
