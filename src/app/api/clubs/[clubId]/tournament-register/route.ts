import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  tournamentRegistrations,
  tournaments,
  tournamentClasses,
  organizations,
  servicePackages,
  packageAssignments,
  inboxMessages,
  messageRecipients,
  clubs,
  people,
  registrationPeople,
} from "@/db/schema";
import { eq, and, max, isNull } from "drizzle-orm";
import { getSession, createToken, setSessionCookie } from "@/lib/auth";
import { sendRegistrationReceived } from "@/lib/email";
import { EMAIL_STRINGS, t as tStr, normaliseLocale } from "@/lib/email-i18n";

// Thrown from inside the registration transaction to roll the whole batch
// back and surface a clean 409 with a localized, actionable message.
class RegistrationConflict extends Error {
  constructor(readonly payload: unknown) {
    super("DUPLICATE_REGISTRATION");
    this.name = "RegistrationConflict";
  }
}

// POST /api/clubs/[clubId]/tournament-register
// Batch-register a club's teams for a tournament.
//
// Each entry in `teams[]` can be:
//   { teamId: number, classId: number, squadAlias?: string, displayName?: string }
//   — register an EXISTING team (reuse across tournaments)
// OR:
//   { name?: string, birthYear?: number, gender?: 'male'|'female'|'mixed', classId: number, squadAlias?: string, displayName?: string }
//   — create a NEW permanent team and register it

type TeamEntry =
  | { teamId: number; classId: number; squadAlias?: string; displayName?: string }
  | { teamId?: undefined; name?: string; birthYear?: number; gender?: "male" | "female" | "mixed"; classId: number; squadAlias?: string; displayName?: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  // 1. Verify session
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const cid = parseInt(clubId);

  if (session.clubId !== cid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // UI locale for user-facing API messages (next-intl sets NEXT_LOCALE).
  const reqLocale = normaliseLocale(req.cookies.get("NEXT_LOCALE")?.value);

  const body = await req.json();
  const { tournamentId, teams: teamEntries } = body as {
    tournamentId: number;
    teams: TeamEntry[];
  };

  // Team-admin scoping: a coach scoped to a single team cannot register OTHER
  // teams of the club, and cannot create brand-new teams during registration
  // — only the existing team they manage may be registered to a new tournament
  // or class.
  if (session.teamId) {
    for (const entry of teamEntries) {
      if (!entry.teamId) {
        return NextResponse.json(
          { error: "Team admins cannot create new teams. Ask the club admin." },
          { status: 403 }
        );
      }
      if (entry.teamId !== session.teamId) {
        return NextResponse.json(
          { error: "Team admins can only register their own team." },
          { status: 403 }
        );
      }
    }
  }

  // 2. Validate tournament
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId));

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (!tournament.registrationOpen) {
    return NextResponse.json({ error: "Registration is closed" }, { status: 400 });
  }

  // Enforce the registration deadline server-side. Until now this was only a
  // decorative field shown in the UI — a club could still POST after it passed.
  if (tournament.registrationDeadline && new Date(tournament.registrationDeadline) < new Date()) {
    return NextResponse.json(
      { error: tStr(EMAIL_STRINGS.registrationDeadline, "passed", reqLocale), code: "DEADLINE_PASSED" },
      { status: 400 }
    );
  }

  // Check plan eligibility: free-plan tournament must be oldest active in org
  if ((tournament.plan as string) === "free") {
    const activeTournaments = await db
      .select({ id: tournaments.id, createdAt: tournaments.createdAt })
      .from(tournaments)
      .where(
        and(
          eq(tournaments.organizationId, tournament.organizationId),
          isNull(tournaments.deletedAt),
          isNull(tournaments.deleteRequestedAt),
        )
      );
    if (activeTournaments.length > 1) {
      const oldest = activeTournaments.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
      if (oldest.id !== tournament.id) {
        return NextResponse.json(
          { error: "This tournament requires a paid plan. Please upgrade." },
          { status: 403 }
        );
      }
    }
  }

  // 3. Validate entries
  if (!Array.isArray(teamEntries) || teamEntries.length === 0) {
    return NextResponse.json({ error: "At least one team is required" }, { status: 400 });
  }

  for (const entry of teamEntries) {
    if (!entry.classId) {
      return NextResponse.json({ error: "Each team entry must have a classId" }, { status: 400 });
    }
    // If creating new team (no teamId), must have at least birthYear or name
    const newEntry = entry as { teamId?: undefined; name?: string; birthYear?: number };
    if (!entry.teamId && !newEntry.name && newEntry.birthYear === undefined) {
      return NextResponse.json(
        { error: "New team entries must have a name or birthYear" },
        { status: 400 }
      );
    }
  }

  // 4. Validate classIds belong to this tournament
  const validClasses = await db
    .select({ id: tournamentClasses.id })
    .from(tournamentClasses)
    .where(eq(tournamentClasses.tournamentId, tournamentId));

  const validClassIds = new Set(validClasses.map((c) => c.id));

  for (const entry of teamEntries) {
    if (!validClassIds.has(entry.classId)) {
      return NextResponse.json(
        { error: `classId ${entry.classId} does not belong to this tournament` },
        { status: 400 }
      );
    }
  }

  // 5. Validate existing teamIds belong to this club
  const existingTeamIds = teamEntries
    .filter((e): e is Extract<TeamEntry, { teamId: number }> => !!e.teamId)
    .map((e) => e.teamId);

  if (existingTeamIds.length > 0) {
    for (const tid of existingTeamIds) {
      const [existingTeam] = await db
        .select({ id: teams.id, clubId: teams.clubId })
        .from(teams)
        .where(eq(teams.id, tid));
      if (!existingTeam || existingTeam.clubId !== cid) {
        return NextResponse.json(
          { error: `Team ${tid} does not belong to this club` },
          { status: 403 }
        );
      }
    }
  }

  // 6. Team limit is NOT enforced here by design. Registrations are a
  //    waitlist/queue: clubs can apply in any quantity. The organizer later
  //    picks which teams to accept into divisions/groups, and THAT is where
  //    the plan limit bites (see /stages/[stageId]/groups/[groupId]/teams).

  // 7. Get next regNumber
  const [maxReg] = await db
    .select({ maxReg: max(tournamentRegistrations.regNumber) })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournamentId));
  let nextRegNumber = (maxReg?.maxReg ?? 10000) + 1;

  // Reads needed by the write transaction below.
  const [defaultPackage] = await db
    .select()
    .from(servicePackages)
    .where(and(eq(servicePackages.tournamentId, tournamentId), eq(servicePackages.isDefault, true)));

  const [club] = await db.select().from(clubs).where(eq(clubs.id, cid));

  // 8-10. Create teams + registrations + package assignments + welcome inbox
  //        message ATOMICALLY. A mid-batch failure (flaky venue connection,
  //        or a duplicate on entry #3) must not leave orphaned `teams` rows or
  //        half a batch committed — everything commits or rolls back together.
  type Registration = {
    teamId: number;
    teamName: string;
    registrationId: number;
    classId: number;
    regNumber: number;
    squadAlias: string;
    isExisting: boolean;
  };
  let registrations: Registration[];
  try {
    registrations = await db.transaction(async (tx) => {
      const regs: Registration[] = [];

      for (const entry of teamEntries) {
        const alias = entry.squadAlias?.trim() ?? "";

        let teamId: number;
        let teamName: string;
        let isExisting = false;

        if (entry.teamId) {
          // Reuse existing team
          teamId = entry.teamId;
          const [t] = await tx.select().from(teams).where(eq(teams.id, teamId));
          teamName = entry.displayName ?? t.name ?? `Team #${teamId}`;
          isExisting = true;
        } else {
          // Create new permanent team
          const gender = (entry as { gender?: "male" | "female" | "mixed" }).gender ?? "male";
          const birthYear = (entry as { birthYear?: number }).birthYear ?? null;
          const baseName = (entry as { name?: string }).name ?? null;

          const [newTeam] = await tx
            .insert(teams)
            .values({ clubId: cid, name: baseName, birthYear, gender })
            .returning();

          teamId = newTeam.id;
          teamName = entry.displayName ?? baseName ?? `${gender} ${birthYear ?? ""}`.trim();
        }

        // Build displayName for this registration
        const displayName = entry.displayName?.trim() || null;

        // Pre-flight: refuse with a clear human message if (team, tournament,
        // alias) already exists. Throwing rolls the whole batch back and is
        // caught below to surface a clean 409.
        const [conflict] = await tx
          .select({ id: tournamentRegistrations.id, classId: tournamentRegistrations.classId })
          .from(tournamentRegistrations)
          .where(
            and(
              eq(tournamentRegistrations.teamId, teamId),
              eq(tournamentRegistrations.tournamentId, tournamentId),
              eq(tournamentRegistrations.squadAlias, alias),
            )
          )
          .limit(1);
        if (conflict) {
          throw new RegistrationConflict({
            error: tStr(
              EMAIL_STRINGS.registrationDuplicate,
              alias ? "aliasUsed" : "alreadyRegistered",
              reqLocale,
              { teamName, alias: alias ?? "" },
            ),
            code: "DUPLICATE_REGISTRATION",
            conflict: { registrationId: conflict.id, teamId, classId: conflict.classId },
          });
        }

        const [registration] = await tx
          .insert(tournamentRegistrations)
          .values({
            teamId,
            tournamentId,
            classId: entry.classId,
            regNumber: nextRegNumber,
            status: "open",
            squadAlias: alias,
            displayName,
          })
          .returning();

        // Backfill registration_people из текущего справочника команды.
        // Если команда существует и в ней уже есть игроки — сразу готовый ростер
        // (клуб может поправить галки потом). Для новой команды — просто пусто.
        const teamPeople = await tx
          .select({ id: people.id })
          .from(people)
          .where(eq(people.teamId, teamId));
        if (teamPeople.length > 0) {
          await tx
            .insert(registrationPeople)
            .values(teamPeople.map((p) => ({ registrationId: registration.id, personId: p.id })))
            .onConflictDoNothing();
        }

        regs.push({
          teamId,
          teamName,
          registrationId: registration.id,
          classId: entry.classId,
          regNumber: nextRegNumber,
          squadAlias: alias,
          isExisting,
        });

        nextRegNumber++;
      }

      // 9. Assign default service package if exists
      if (defaultPackage) {
        for (const reg of regs) {
          await tx.insert(packageAssignments).values({
            registrationId: reg.registrationId,
            packageId: defaultPackage.id,
          });
        }
      }

      // 10. Welcome inbox message — in the club's preferred language.
      const clubLocale = normaliseLocale(club.preferredLocale);
      const welcomeSubject = tStr(EMAIL_STRINGS.registrationWelcome, "subject", clubLocale);
      const welcomeBody = tStr(EMAIL_STRINGS.registrationWelcome, "body", clubLocale, { clubName: club.name });

      const [message] = await tx
        .insert(inboxMessages)
        .values({
          tournamentId,
          subject: welcomeSubject,
          body: welcomeBody,
          sentBy: 0,
          sendToAll: false,
        })
        .returning();

      for (const reg of regs) {
        await tx.insert(messageRecipients).values({
          messageId: message.id,
          registrationId: reg.registrationId,
        });
      }

      return regs;
    });
  } catch (e) {
    if (e instanceof RegistrationConflict) {
      return NextResponse.json(e.payload, { status: 409 });
    }
    throw e;
  }

  // 10b. Send confirmation email
  if (club?.contactEmail) {
    const teamNames = registrations.map((r) => r.teamName).join(", ");
    sendRegistrationReceived({
      to: club.contactEmail,
      clubName: club.name,
      teamName: teamNames,
      tournamentName: tournament.name,
      locale: club.preferredLocale,
    }).catch((e) => console.error("[EMAIL] Registration received send failed:", e));
  }

  // 11. Update JWT cookie with tournament context
  const [orgRow] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, tournament.organizationId));

  // Strip exp/iat from decoded session before re-signing to avoid "payload already has exp" error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { exp, iat, ...sessionPayload } = session as typeof session & { exp?: number; iat?: number };
  const newToken = createToken({
    ...sessionPayload,
    tournamentId,
    organizationId: tournament.organizationId,
    organizationSlug: orgRow?.slug,
  });
  await setSessionCookie(newToken);

  return NextResponse.json({ ok: true, registrations }, { status: 201 });
}
