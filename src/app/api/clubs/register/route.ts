import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  clubs, clubUsers, clubUserTeams, teams, registrationAttempts, emailVerifications,
  tournaments, tournamentClasses, tournamentRegistrations,
  servicePackages, packageAssignments, inboxMessages, messageRecipients,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, gt, desc, max } from "drizzle-orm";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail, sendCoachJoinedNotification, sendRegistrationReceived } from "@/lib/email";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function logAttempt(data: {
  clubName?: string; contactEmail?: string; contactName?: string;
  country?: string; city?: string;
  hasLogo?: boolean; status: string; failReason?: string; clubId?: number;
  ip: string; userAgent: string;
}) {
  try {
    await db.insert(registrationAttempts).values({
      clubName: data.clubName ?? null, contactEmail: data.contactEmail ?? null,
      contactName: data.contactName ?? null, country: data.country ?? null,
      city: data.city ?? null,
      hasLogo: data.hasLogo ?? false,
      status: data.status, failReason: data.failReason ?? null,
      clubId: data.clubId ?? null, ip: data.ip, userAgent: data.userAgent.slice(0, 500),
    });
  } catch (e) { console.error("[REGISTER] Failed to write attempt log:", e); }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  const formData = await req.formData();

  const clubName = formData.get("clubName") as string;
  const country = formData.get("country") as string;
  const city = formData.get("city") as string;
  const contactName = formData.get("contactName") as string;
  const contactEmail = (formData.get("contactEmail") as string)?.toLowerCase().trim();
  const contactPhone = formData.get("contactPhone") as string;
  const password = formData.get("password") as string;
  const logoFile = formData.get("logo") as File | null;
  // When the user picked an existing club from the global search results,
  // the frontend sends its id here. We re-use that club instead of creating
  // a duplicate. The new clubUser still gets created as a write-access admin
  // for now (full team scoping will land in a follow-up PR).
  const existingClubIdRaw = formData.get("existingClubId") as string | null;
  const existingClubId = existingClubIdRaw ? parseInt(existingClubIdRaw) : null;
  // When an EXISTING club is picked the new coach must declare which
  // team they're joining (or creating). One of the two below is set:
  //   joinTeamId: number    — pick an existing team of the club
  //   newTeam: { name?, birthYear?, gender? } — create a new team
  // For new-club registrations these are both null (the user becomes
  // the first club admin and creates teams via the tournament step).
  const joinTeamIdRaw = formData.get("joinTeamId") as string | null;
  const joinTeamId = joinTeamIdRaw ? parseInt(joinTeamIdRaw) : null;
  const newTeamRaw = formData.get("newTeam") as string | null;
  let newTeam: { name?: string | null; birthYear?: number | null; gender?: "male" | "female" | "mixed" } | null = null;
  if (newTeamRaw) {
    try {
      const parsed = JSON.parse(newTeamRaw);
      if (parsed && typeof parsed === "object") newTeam = parsed;
    } catch { /* ignore — null fallback */ }
  }
  // Tournament registration payload — what the user is signing up for.
  // teams[]: array of { classId, name? } (one entry per division).
  const tournamentIdRaw = formData.get("tournamentId") as string | null;
  const tournamentId = tournamentIdRaw ? parseInt(tournamentIdRaw) : null;
  const teamsRaw = formData.get("teams") as string | null;
  let teamEntries: Array<{ classId: number; name?: string }> = [];
  if (teamsRaw) {
    try {
      const parsed = JSON.parse(teamsRaw);
      if (Array.isArray(parsed)) {
        teamEntries = parsed
          .filter((e) => e && typeof e === "object" && Number.isFinite(parseInt(String(e.classId))))
          .map((e) => ({
            classId: parseInt(String(e.classId)),
            name: typeof e.name === "string" ? e.name : undefined,
          }));
      }
    } catch { /* ignore */ }
  }

  console.log(`[REGISTER] attempt — club="${clubName}" email="${contactEmail}" ip=${ip}`);
  const base = { clubName, contactEmail, contactName, country, city, ip, userAgent: ua };

  if (!clubName || !contactEmail || !password) {
    const reason = `Missing: ${!clubName ? "clubName " : ""}${!contactEmail ? "email " : ""}${!password ? "password" : ""}`.trim();
    await logAttempt({ ...base, status: "fail_missing_fields", failReason: reason });
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existingUser = await db.query.clubUsers.findFirst({ where: eq(clubUsers.email, contactEmail) });
  if (existingUser) {
    await logAttempt({ ...base, status: "duplicate_email", failReason: "Email already registered" });
    return NextResponse.json({ error: "An account with this email already exists. Please log in." }, { status: 409 });
  }

  // Email-verification gate: a recent, verified, un-consumed row must
  // exist for this email. Window is 30 min from verified_at.
  const verifyWindow = new Date(Date.now() - 30 * 60 * 1000);
  const [verification] = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, contactEmail),
        isNotNull(emailVerifications.verifiedAt),
        isNull(emailVerifications.usedAt),
        gt(emailVerifications.verifiedAt, verifyWindow),
      )
    )
    .orderBy(desc(emailVerifications.verifiedAt))
    .limit(1);
  if (!verification) {
    await logAttempt({ ...base, status: "fail_email_unverified", failReason: "email not verified" });
    return NextResponse.json(
      { error: "Please verify your email before completing registration." },
      { status: 400 }
    );
  }

  let club: { id: number; name: string };
  let hasLogo = false;

  if (existingClubId) {
    // ── Existing-club path: re-use the global club row, skip logo / slug ──
    const found = await db.query.clubs.findFirst({ where: eq(clubs.id, existingClubId) });
    if (!found) {
      await logAttempt({ ...base, status: "fail_existing_club_not_found", failReason: `clubId=${existingClubId}` });
      return NextResponse.json({ error: "Selected club no longer exists. Search again." }, { status: 404 });
    }
    club = { id: found.id, name: found.name };
    console.log(`[REGISTER] existing-club path — clubId=${club.id} ("${club.name}")`);
  } else {
    // ── New-club path: original flow ──
    let badgeUrl: string | null = null;
    hasLogo = !!(logoFile && logoFile.size > 0);
    if (hasLogo) {
      const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      if (allowed.includes(logoFile!.type) && logoFile!.size <= 10 * 1024 * 1024) {
        const ext = logoFile!.name.split(".").pop() ?? "png";
        const filename = `club-${Date.now()}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "badges");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), Buffer.from(await logoFile!.arrayBuffer()));
        badgeUrl = `/uploads/badges/${filename}`;
      }
    }

    // Slug из названия клуба
    const baseSlug = clubName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Создаём глобальный клуб
    const [created] = await db.insert(clubs).values({
      name: clubName, slug: `${baseSlug}-${Date.now()}`,
      country, city, badgeUrl, contactName, contactEmail, contactPhone,
    }).returning();
    club = { id: created.id, name: created.name };
  }

  // Determine what role this clubUser gets:
  //   - new-club path → first admin of the new club (teamId = null)
  //   - existing-club path → must pick or create a team (teamId set,
  //     junction row inserted). The new user is a team coach, NOT a
  //     second club admin.
  let coachTeamId: number | null = null;
  // For an existing-club JOIN we mark the junction "pending" so the
  // club admin can later confirm. For a brand-new TEAM the joining
  // coach made themselves, no admin approval applies → "approved".
  let coachJunctionStatus: "pending" | "approved" = "approved";
  let teamLabelForEmail: string | null = null;
  if (existingClubId) {
    if (joinTeamId) {
      const [t] = await db.select().from(teams).where(eq(teams.id, joinTeamId));
      if (!t || t.clubId !== club.id) {
        await logAttempt({ ...base, status: "fail_team_mismatch", failReason: `joinTeamId=${joinTeamId}` });
        return NextResponse.json({ error: "Selected team does not belong to this club." }, { status: 400 });
      }
      coachTeamId = t.id;
      coachJunctionStatus = "pending";
      teamLabelForEmail = t.name ?? `${t.birthYear ?? ""} ${t.gender}`.trim();
    } else if (newTeam) {
      const [created] = await db
        .insert(teams)
        .values({
          clubId: club.id,
          name: newTeam.name?.toString().trim() || null,
          birthYear: newTeam.birthYear ?? null,
          gender: (newTeam.gender ?? "male") as "male" | "female" | "mixed",
        })
        .returning();
      coachTeamId = created.id;
      coachJunctionStatus = "approved";
      teamLabelForEmail = created.name ?? `${created.birthYear ?? ""} ${created.gender}`.trim();
    } else {
      await logAttempt({ ...base, status: "fail_no_team", failReason: "joinTeamId/newTeam required" });
      return NextResponse.json(
        { error: "Pick an existing team or create a new one." },
        { status: 400 }
      );
    }
  }

  // Создаём пользователя клуба
  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(clubUsers)
    .values({
      clubId: club.id,
      email: contactEmail,
      name: contactName,
      passwordHash,
      accessLevel: "write",
      teamId: coachTeamId,
    })
    .returning();

  // Junction row when this is a team coach (existing-club path).
  if (coachTeamId) {
    await db
      .insert(clubUserTeams)
      .values({ clubUserId: newUser.id, teamId: coachTeamId, status: coachJunctionStatus })
      .onConflictDoNothing();

    // Notify all club admins (clubUsers with team_id IS NULL) of the new
    // arrival — fire-and-forget, never block the registration response.
    if (coachJunctionStatus === "pending") {
      const admins = await db
        .select({ email: clubUsers.email })
        .from(clubUsers)
        .where(and(eq(clubUsers.clubId, club.id), isNull(clubUsers.teamId)));
      const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://goalityfootball.com"}/en/club/dashboard`;
      for (const admin of admins) {
        if (!admin.email) continue;
        sendCoachJoinedNotification({
          to: admin.email,
          clubName: club.name,
          coachName: contactName,
          coachEmail: contactEmail,
          teamLabel: teamLabelForEmail ?? "—",
          dashboardLink,
        }).catch((e) => console.error("[EMAIL] coach-joined notify failed:", e));
      }
    }
  }

  // Consume the email verification — single-use.
  await db
    .update(emailVerifications)
    .set({ usedAt: new Date() })
    .where(eq(emailVerifications.id, verification.id));

  await logAttempt({ ...base, hasLogo, status: "success", clubId: club.id });

  // ── Tournament registration (the actual divisions the user is joining) ──
  // Frontend's step 4 sends teams[] = [{classId, name?}, ...]. For each
  // entry we materialise a team (deriving birthYear from the class's
  // minBirthYear) and a tournament_registrations row, then assign the
  // tournament's default service package and create a welcome inbox
  // message + receipt email — the same outputs the existing
  // /api/clubs/[clubId]/tournament-register endpoint produces.
  const tournamentRegistrationsCreated: Array<{ teamId: number; teamName: string; registrationId: number; classId: number; regNumber: number }> = [];
  if (tournamentId && teamEntries.length > 0) {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
    if (!tournament) {
      console.warn(`[REGISTER] tournamentId=${tournamentId} not found — skipping registrations`);
    } else if (!tournament.registrationOpen) {
      console.warn(`[REGISTER] tournament ${tournamentId} registration closed — skipping`);
    } else {
      // Validate classIds belong to this tournament.
      const validClasses = await db
        .select({ id: tournamentClasses.id, name: tournamentClasses.name, minBirthYear: tournamentClasses.minBirthYear, maxBirthYear: tournamentClasses.maxBirthYear })
        .from(tournamentClasses)
        .where(eq(tournamentClasses.tournamentId, tournamentId));
      const classById = new Map(validClasses.map((c) => [c.id, c]));

      const [maxReg] = await db
        .select({ maxReg: max(tournamentRegistrations.regNumber) })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, tournamentId));
      let nextRegNumber = (maxReg?.maxReg ?? 10000) + 1;

      const [defaultPackage] = await db
        .select()
        .from(servicePackages)
        .where(and(eq(servicePackages.tournamentId, tournamentId), eq(servicePackages.isDefault, true)));

      for (const entry of teamEntries) {
        const cls = classById.get(entry.classId);
        if (!cls) continue; // class doesn't belong to this tournament — skip

        // Materialise a team. Existing-club path with a single picked
        // coach team reuses that team; otherwise create per-class.
        let teamId = coachTeamId;
        let teamName = entry.name?.trim() || club.name;
        if (!teamId) {
          const [newTeamRow] = await db
            .insert(teams)
            .values({
              clubId: club.id,
              name: entry.name?.trim() || null,
              birthYear: cls.minBirthYear ?? null,
              gender: "male",
            })
            .returning();
          teamId = newTeamRow.id;
          teamName = newTeamRow.name ?? `${club.name} ${cls.minBirthYear ?? cls.name}`;
          // Backfill: junction row when this is the user's only team
          // (no junction yet because they're an admin-of-a-new-club).
          // We skip if there are multiple new teams — the user is club
          // admin and shouldn't be locked to a single team.
          if (teamEntries.length === 1 && !existingClubId) {
            await db.insert(clubUserTeams).values({
              clubUserId: newUser.id,
              teamId,
              status: "approved",
            }).onConflictDoNothing();
          }
        }

        const [registration] = await db
          .insert(tournamentRegistrations)
          .values({
            teamId,
            tournamentId,
            classId: cls.id,
            regNumber: nextRegNumber,
            status: "open",
            squadAlias: "",
            displayName: null,
          })
          .returning();

        if (defaultPackage) {
          await db.insert(packageAssignments).values({
            registrationId: registration.id,
            packageId: defaultPackage.id,
          });
        }

        tournamentRegistrationsCreated.push({
          teamId,
          teamName,
          registrationId: registration.id,
          classId: cls.id,
          regNumber: nextRegNumber,
        });
        nextRegNumber++;
      }

      // Welcome inbox message routed to all freshly-created registrations.
      if (tournamentRegistrationsCreated.length > 0) {
        const welcomeBody =
          `Dear ${club.name},\n\nYour teams have been successfully registered!\n\nPlease complete your registration by filling in:\n` +
          `✅ Players — add all players\n✅ Staff — add coaching staff\n✅ Travel — arrival and departure details\n\n` +
          `If you have any questions, use the Inbox to contact the organizer.\n\nGoality TMC`;
        const [message] = await db
          .insert(inboxMessages)
          .values({
            tournamentId,
            subject: "Welcome! Your registration is confirmed",
            body: welcomeBody,
            sentBy: 0,
            sendToAll: false,
          })
          .returning();
        for (const reg of tournamentRegistrationsCreated) {
          await db.insert(messageRecipients).values({
            messageId: message.id,
            registrationId: reg.registrationId,
          });
        }

        // Receipt email — fire & forget.
        const teamNamesForEmail = tournamentRegistrationsCreated.map((r) => r.teamName).join(", ");
        sendRegistrationReceived({
          to: contactEmail,
          clubName: club.name,
          teamName: teamNamesForEmail,
          tournamentName: tournament.name,
        }).catch((e) => console.error("[EMAIL] Registration received send failed:", e));
      }
    }
  }

  // Welcome email (fire & forget) — uses the actual club name (which may
  // differ from the form input when an existing club was picked).
  sendWelcomeEmail({ to: contactEmail, clubName: club.name, contactName }).catch(
    (e) => console.error("[EMAIL] Welcome send failed:", e),
  );

  // Auto-login as the freshly-created clubUser. (Bug fix: previous code
  // signed `userId: club.id` which is the CLUB id, not the user id.)
  const token = createToken({
    userId: newUser.id,
    role: "club",
    clubId: club.id,
    ...(coachTeamId ? { teamId: coachTeamId } : {}),
  });
  await setSessionCookie(token);

  console.log(`[REGISTER] SUCCESS — club="${club.name}" clubId=${club.id} userId=${newUser.id} teamId=${coachTeamId ?? "—"} regs=${tournamentRegistrationsCreated.length}`);
  return NextResponse.json({
    ok: true,
    clubId: club.id,
    teamId: coachTeamId,
    registrations: tournamentRegistrationsCreated,
  });
}
