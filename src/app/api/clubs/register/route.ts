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
import { EMAIL_STRINGS, t as tStr, normaliseLocale } from "@/lib/email-i18n";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/password";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function logAttempt(data: {
  clubName?: string; contactEmail?: string; contactName?: string;
  country?: string; city?: string;
  hasLogo?: boolean; status: string; failReason?: string; clubId?: number;
  tournamentId?: number | null; ip: string; userAgent: string;
}) {
  try {
    await db.insert(registrationAttempts).values({
      clubName: data.clubName ?? null, contactEmail: data.contactEmail ?? null,
      contactName: data.contactName ?? null, country: data.country ?? null,
      city: data.city ?? null,
      hasLogo: data.hasLogo ?? false,
      status: data.status, failReason: data.failReason ?? null,
      clubId: data.clubId ?? null, tournamentId: data.tournamentId ?? null,
      ip: data.ip, userAgent: data.userAgent.slice(0, 500),
    });
  } catch (e) { console.error("[REGISTER] Failed to write attempt log:", e); }
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0].trim())
    ?? req.headers.get("x-real-ip") ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";

  // Rate-limit: this is an unauthenticated endpoint that creates an
  // account AND writes an uploaded file — a spam/DoS target. 5 / 15 min
  // per IP is plenty for a real person (with retries) but stops abuse.
  const ipLimit = checkRateLimit(`clubreg:ip:${ip}`, 5, 15 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSec);
  // Capture the user's UI locale at signup so every notification we
  // ever send to this club is rendered in their language. NEXT_LOCALE
  // is set by next-intl middleware; falls back to the Accept-Language
  // header's first hit, then "en".
  const userLocale = (() => {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
    if (cookieLocale && /^(en|ru|et|es)$/.test(cookieLocale)) return cookieLocale;
    const accept = req.headers.get("accept-language") ?? "";
    const first = accept.split(",")[0]?.split("-")[0]?.toLowerCase() ?? "";
    return ["en", "ru", "et", "es"].includes(first) ? first : "en";
  })();
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
  const base = { clubName, contactEmail, contactName, country, city, tournamentId, ip, userAgent: ua };

  if (!clubName || !contactEmail || !password) {
    const reason = `Missing: ${!clubName ? "clubName " : ""}${!contactEmail ? "email " : ""}${!password ? "password" : ""}`.trim();
    await logAttempt({ ...base, status: "fail_missing_fields", failReason: reason });
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isPasswordValid(password)) {
    await logAttempt({ ...base, status: "fail_weak_password", failReason: "password policy" });
    return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
  }

  // Per-email cap (3 / hour) — blocks scripted retries against one
  // address even if they rotate IPs.
  const emailLimit = checkRateLimit(`clubreg:em:${contactEmail}`, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterSec);

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

  // ── PRE-TRANSACTION: validation + reads (may early-return) ──
  // No DB writes happen here, so a rejection cannot orphan anything.
  let hasLogo = false;
  let badgeUrl: string | null = null;
  // For an EXISTING club we resolve the row now (read-only). For a NEW
  // club the row is created inside the transaction below.
  let existingClub: { id: number; name: string; preferredLocale: string } | null = null;

  if (existingClubId) {
    const found = await db.query.clubs.findFirst({ where: eq(clubs.id, existingClubId) });
    if (!found) {
      await logAttempt({ ...base, status: "fail_existing_club_not_found", failReason: `clubId=${existingClubId}` });
      return NextResponse.json({ error: "Selected club no longer exists. Search again." }, { status: 404 });
    }
    existingClub = { id: found.id, name: found.name, preferredLocale: found.preferredLocale ?? userLocale };
    console.log(`[REGISTER] existing-club path — clubId=${existingClub.id} ("${existingClub.name}")`);
  } else {
    // Logo write is a filesystem side-effect — it cannot participate in a
    // DB transaction. We accept that a failed txn may leave an orphan file
    // (harmless, unreferenced) rather than risk an orphan DB account.
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
  }

  // Coach-team resolution for the EXISTING-club path. joinTeamId is a
  // pure read+check (early-return safe); a brand-new team is INSERTED
  // inside the transaction (so it rolls back with everything else).
  let coachTeamId: number | null = null;
  let coachJunctionStatus: "pending" | "approved" = "approved";
  let teamLabelForEmail: string | null = null;
  let createTeamInTxn: { name: string | null; birthYear: number | null; gender: "male" | "female" | "mixed" } | null = null;
  if (existingClubId && existingClub) {
    if (joinTeamId) {
      const [t] = await db.select().from(teams).where(eq(teams.id, joinTeamId));
      if (!t || t.clubId !== existingClub.id) {
        await logAttempt({ ...base, status: "fail_team_mismatch", failReason: `joinTeamId=${joinTeamId}` });
        return NextResponse.json({ error: "Selected team does not belong to this club." }, { status: 400 });
      }
      coachTeamId = t.id;
      coachJunctionStatus = "pending";
      teamLabelForEmail = t.name ?? `${t.birthYear ?? ""} ${t.gender}`.trim();
    } else if (newTeam) {
      createTeamInTxn = {
        name: newTeam.name?.toString().trim() || null,
        birthYear: newTeam.birthYear ?? null,
        gender: (newTeam.gender ?? "male") as "male" | "female" | "mixed",
      };
      coachJunctionStatus = "approved";
    } else {
      await logAttempt({ ...base, status: "fail_no_team", failReason: "joinTeamId/newTeam required" });
      return NextResponse.json(
        { error: "Pick an existing team or create a new one." },
        { status: 400 }
      );
    }
  }

  const passwordHash = await hashPassword(password);

  // ── TRANSACTION: every write is atomic. A failure anywhere here rolls
  // back the whole thing — no orphan club/user, so a retry is clean. ──
  let club!: { id: number; name: string; preferredLocale: string };
  let newUserId!: number;
  let tournamentNameForEmail: string | null = null;
  const tournamentRegistrationsCreated: Array<{ teamId: number; teamName: string; registrationId: number; classId: number; regNumber: number }> = [];

  await db.transaction(async (tx) => {
    // 1. Club — reuse existing or create new.
    if (existingClub) {
      club = existingClub;
    } else {
      const baseSlug = clubName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const [created] = await tx.insert(clubs).values({
        name: clubName, slug: `${baseSlug}-${Date.now()}`,
        country, city, badgeUrl, contactName, contactEmail, contactPhone,
        preferredLocale: userLocale,
      }).returning();
      club = { id: created.id, name: created.name, preferredLocale: created.preferredLocale ?? userLocale };
    }

    // 2. Existing-club brand-new team (deferred from pre-txn).
    if (createTeamInTxn) {
      const [created] = await tx.insert(teams).values({
        clubId: club.id,
        name: createTeamInTxn.name,
        birthYear: createTeamInTxn.birthYear,
        gender: createTeamInTxn.gender,
      }).returning();
      coachTeamId = created.id;
      teamLabelForEmail = created.name ?? `${created.birthYear ?? ""} ${created.gender}`.trim();
    }

    // 3. Club user.
    const [newUser] = await tx
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
    newUserId = newUser.id;

    // 4. Coach↔team junction (existing-club path).
    if (coachTeamId) {
      await tx
        .insert(clubUserTeams)
        .values({ clubUserId: newUser.id, teamId: coachTeamId, status: coachJunctionStatus })
        .onConflictDoNothing();
    }

    // 5. Consume the email verification — single-use, inside the txn so
    //    a rollback leaves it un-consumed and the user can retry.
    await tx
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id));

    // 6. Tournament registration (divisions the user is joining).
    if (tournamentId && teamEntries.length > 0) {
      const [tournament] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      if (!tournament) {
        console.warn(`[REGISTER] tournamentId=${tournamentId} not found — skipping registrations`);
      } else if (!tournament.registrationOpen) {
        console.warn(`[REGISTER] tournament ${tournamentId} registration closed — skipping`);
      } else if (tournament.registrationDeadline && new Date(tournament.registrationDeadline) < new Date()) {
        console.warn(`[REGISTER] tournament ${tournamentId} registration deadline passed — skipping`);
      } else {
        tournamentNameForEmail = tournament.name;
        const validClasses = await tx
          .select({ id: tournamentClasses.id, name: tournamentClasses.name, minBirthYear: tournamentClasses.minBirthYear, maxBirthYear: tournamentClasses.maxBirthYear })
          .from(tournamentClasses)
          .where(eq(tournamentClasses.tournamentId, tournamentId));
        const classById = new Map(validClasses.map((c) => [c.id, c]));

        const [maxReg] = await tx
          .select({ maxReg: max(tournamentRegistrations.regNumber) })
          .from(tournamentRegistrations)
          .where(eq(tournamentRegistrations.tournamentId, tournamentId));
        let nextRegNumber = (maxReg?.maxReg ?? 10000) + 1;

        const [defaultPackage] = await tx
          .select()
          .from(servicePackages)
          .where(and(eq(servicePackages.tournamentId, tournamentId), eq(servicePackages.isDefault, true)));

        for (const entry of teamEntries) {
          const cls = classById.get(entry.classId);
          if (!cls) continue; // class doesn't belong to this tournament — skip

          let teamId = coachTeamId;
          let teamName = entry.name?.trim() || club.name;
          if (!teamId) {
            const [newTeamRow] = await tx
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
            if (teamEntries.length === 1 && !existingClubId) {
              await tx.insert(clubUserTeams).values({
                clubUserId: newUser.id,
                teamId,
                status: "approved",
              }).onConflictDoNothing();
            }
          }

          const [registration] = await tx
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
            await tx.insert(packageAssignments).values({
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

        // 7. Welcome inbox message routed to all created registrations,
        //    in the club's preferred language.
        if (tournamentRegistrationsCreated.length > 0) {
          const inboxLocale = normaliseLocale(club.preferredLocale);
          const welcomeBody = tStr(EMAIL_STRINGS.registrationWelcome, "body", inboxLocale, { clubName: club.name });
          const [message] = await tx
            .insert(inboxMessages)
            .values({
              tournamentId,
              subject: tStr(EMAIL_STRINGS.registrationWelcome, "subject", inboxLocale),
              body: welcomeBody,
              sentBy: 0,
              sendToAll: false,
            })
            .returning();
          for (const reg of tournamentRegistrationsCreated) {
            await tx.insert(messageRecipients).values({
              messageId: message.id,
              registrationId: reg.registrationId,
            });
          }
        }
      }
    }
  });

  // ── POST-TRANSACTION: side-effects. Only run after a successful commit
  // so we never email / log success / set a session for a rolled-back
  // registration. None of these block or revert the DB outcome. ──
  await logAttempt({ ...base, hasLogo, status: "success", clubId: club.id });

  // Notify club admins of a pending coach join (existing-club path).
  if (coachTeamId && coachJunctionStatus === "pending") {
    const admins = await db
      .select({ email: clubUsers.email })
      .from(clubUsers)
      .where(and(eq(clubUsers.clubId, club.id), isNull(clubUsers.teamId)));
    const adminLocale = club.preferredLocale;
    const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://goalityfootball.com"}/${adminLocale}/club/dashboard`;
    for (const admin of admins) {
      if (!admin.email) continue;
      sendCoachJoinedNotification({
        to: admin.email,
        clubName: club.name,
        coachName: contactName,
        coachEmail: contactEmail,
        teamLabel: teamLabelForEmail ?? "—",
        dashboardLink,
        locale: adminLocale,
      }).catch((e) => console.error("[EMAIL] coach-joined notify failed:", e));
    }
  }

  // Receipt email — fire & forget.
  if (tournamentRegistrationsCreated.length > 0) {
    const teamNamesForEmail = tournamentRegistrationsCreated.map((r) => r.teamName).join(", ");
    sendRegistrationReceived({
      to: contactEmail,
      clubName: club.name,
      teamName: teamNamesForEmail,
      tournamentName: tournamentNameForEmail ?? "",
      locale: club.preferredLocale,
    }).catch((e) => console.error("[EMAIL] Registration received send failed:", e));
  }

  // Welcome email (fire & forget).
  sendWelcomeEmail({ to: contactEmail, clubName: club.name, contactName, locale: club.preferredLocale }).catch(
    (e) => console.error("[EMAIL] Welcome send failed:", e),
  );

  // Auto-login as the freshly-created clubUser.
  const token = createToken({
    userId: newUserId,
    role: "club",
    clubId: club.id,
    ...(coachTeamId ? { teamId: coachTeamId } : {}),
  });
  await setSessionCookie(token);

  console.log(`[REGISTER] SUCCESS — club="${club.name}" clubId=${club.id} userId=${newUserId} teamId=${coachTeamId ?? "—"} regs=${tournamentRegistrationsCreated.length}`);
  return NextResponse.json({
    ok: true,
    clubId: club.id,
    teamId: coachTeamId,
    registrations: tournamentRegistrationsCreated,
  });
}
