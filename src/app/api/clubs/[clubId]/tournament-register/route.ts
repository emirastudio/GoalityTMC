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
} from "@/db/schema";
import { eq, and, max, count, isNull } from "drizzle-orm";
import { getSession, createToken, setSessionCookie } from "@/lib/auth";
import { sendRegistrationReceived } from "@/lib/email";

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

  const body = await req.json();
  const { tournamentId, teams: teamEntries } = body as {
    tournamentId: number;
    teams: TeamEntry[];
  };

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

  // 6. (team limit is NOT enforced here — registrations are a waitlist/queue,
  //     limit is only checked when organizer assigns teams to divisions/groups)

  // 7. Get next regNumber
  const [maxReg] = await db
    .select({ maxReg: max(tournamentRegistrations.regNumber) })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.tournamentId, tournamentId));
  let nextRegNumber = (maxReg?.maxReg ?? 10000) + 1;

  // 8. Create/reuse teams + registrations
  const registrations: Array<{
    teamId: number;
    teamName: string;
    registrationId: number;
    classId: number;
    regNumber: number;
    squadAlias: string;
    isExisting: boolean;
  }> = [];

  for (const entry of teamEntries) {
    const alias = entry.squadAlias?.trim() ?? "";

    let teamId: number;
    let teamName: string;
    let isExisting = false;

    if (entry.teamId) {
      // Reuse existing team
      teamId = entry.teamId;
      const [t] = await db.select().from(teams).where(eq(teams.id, teamId));
      teamName = entry.displayName ?? t.name ?? `Team #${teamId}`;
      isExisting = true;
    } else {
      // Create new permanent team
      const gender = (entry as { gender?: "male" | "female" | "mixed" }).gender ?? "male";
      const birthYear = (entry as { birthYear?: number }).birthYear ?? null;
      const baseName = (entry as { name?: string }).name ?? null;

      const [newTeam] = await db
        .insert(teams)
        .values({ clubId: cid, name: baseName, birthYear, gender })
        .returning();

      teamId = newTeam.id;
      teamName = entry.displayName ?? baseName ?? `${gender} ${birthYear ?? ""}`.trim();
    }

    // Build displayName for this registration
    const displayName = entry.displayName?.trim() || null;

    const [registration] = await db
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

    registrations.push({
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
  const [defaultPackage] = await db
    .select()
    .from(servicePackages)
    .where(
      and(
        eq(servicePackages.tournamentId, tournamentId),
        eq(servicePackages.isDefault, true)
      )
    );

  if (defaultPackage) {
    for (const reg of registrations) {
      await db.insert(packageAssignments).values({
        registrationId: reg.registrationId,
        packageId: defaultPackage.id,
      });
    }
  }

  // 10. Create welcome inbox message
  const [club] = await db.select().from(clubs).where(eq(clubs.id, cid));

  const welcomeSubject = "Welcome! Your registration is confirmed";
  const welcomeBody = `Dear ${club.name},\n\nYour teams have been successfully registered!\n\nPlease complete your registration by filling in:\n✅ Players — add all players\n✅ Staff — add coaching staff\n✅ Travel — arrival and departure details\n\nIf you have any questions, use the Inbox to contact the organizer.\n\nGoality TMC`;

  const [message] = await db
    .insert(inboxMessages)
    .values({
      tournamentId,
      subject: welcomeSubject,
      body: welcomeBody,
      sentBy: 0,
      sendToAll: false,
    })
    .returning();

  for (const reg of registrations) {
    await db.insert(messageRecipients).values({
      messageId: message.id,
      registrationId: reg.registrationId,
    });
  }

  // 10b. Send confirmation email
  if (club?.contactEmail) {
    const teamNames = registrations.map((r) => r.teamName).join(", ");
    sendRegistrationReceived({
      to: club.contactEmail,
      clubName: club.name,
      teamName: teamNames,
      tournamentName: tournament.name,
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
