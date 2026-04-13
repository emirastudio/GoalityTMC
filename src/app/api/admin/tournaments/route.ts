import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournaments,
  tournamentClasses,
  tournamentProducts,
  tournamentRegistrations,
  organizations,
} from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq, and, isNull, ne, count } from "drizzle-orm";
import {
  getEffectivePlan,
  PLAN_LIMITS,
  type TournamentPlan,
} from "@/lib/plan-gates";

export async function GET(req: NextRequest) {
  try {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const url = new URL(req.url);
  const tournamentIdParam = url.searchParams.get("tournamentId");

  let tournament;
  if (tournamentIdParam) {
    const tid = parseInt(tournamentIdParam);
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tid),
    });
    // Org admins: verify tournament belongs to their org (super admins bypass this)
    if (!session.isSuper && tournament && session.organizationId && tournament.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.registrationOpen, true),
    });
  }

  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, tournament.id),
  });

  const products = await db.query.tournamentProducts.findMany({
    where: eq(tournamentProducts.tournamentId, tournament.id),
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });

  return NextResponse.json({ ...tournament, classes, products });
  } catch (err) {
    console.error("[GET /api/admin/tournaments] ERROR:", err);
    return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const url = new URL(req.url);
  const tournamentIdParam = url.searchParams.get("tournamentId");

  let tournament;
  if (tournamentIdParam) {
    const tid = parseInt(tournamentIdParam);
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tid),
    });
    // Org admins: verify tournament belongs to their org (super admins bypass this)
    if (!session.isSuper && tournament && session.organizationId && tournament.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.registrationOpen, true),
    });
  }

  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { classes, products, ...tournamentFields } = body;

  // ── Plan gate: check division limit before saving classes ──────────────
  if (Array.isArray(classes)) {
    const nonDeleted = classes.filter((c) => !c._deleted);
    if (nonDeleted.length > 0) {
      const [org] = await db
        .select({ eliteSubStatus: organizations.eliteSubStatus })
        .from(organizations)
        .where(eq(organizations.id, tournament.organizationId))
        .limit(1);
      const effectivePlan = getEffectivePlan(
        (tournament.plan as TournamentPlan) ?? "free",
        org?.eliteSubStatus
      );
      const extraDiv = (tournament as { extraDivisionsPurchased?: number }).extraDivisionsPurchased ?? 0;
      const maxDiv = PLAN_LIMITS[effectivePlan].maxDivisions;
      const effectiveMax = maxDiv === Infinity ? Infinity : maxDiv + extraDiv;
      if (effectiveMax !== Infinity && nonDeleted.length > effectiveMax) {
        return NextResponse.json(
          {
            error: "Division limit exceeded",
            code: "DIVISION_LIMIT",
            currentPlan: effectivePlan,
            maxDivisions: effectiveMax,
            attempted: nonDeleted.length,
            upgradeUrl: "billing",
          },
          { status: 402 }
        );
      }
    }
  }

  // ── Extras overdue gate: block publish if extra divisions are unpaid past due date ──
  if (tournamentFields.registrationOpen === true && tournament) {
    const nowDateStr = new Date().toISOString().split("T")[0];
    const due = (tournament as { extrasPaymentDue?: string | null }).extrasPaymentDue;
    if (due && due < nowDateStr) {
      // Re-check if there are actually unpaid divisions
      const [org2] = await db
        .select({ eliteSubStatus: organizations.eliteSubStatus })
        .from(organizations)
        .where(eq(organizations.id, tournament.organizationId))
        .limit(1);
      const ep2 = getEffectivePlan((tournament.plan as TournamentPlan) ?? "free", org2?.eliteSubStatus);
      const lim2 = PLAN_LIMITS[ep2];
      const ed2  = (tournament as { extraDivisionsPurchased?: number }).extraDivisionsPurchased ?? 0;
      const maxDivAllowed = lim2.maxDivisions === Infinity ? Infinity : lim2.maxDivisions + ed2;
      if (maxDivAllowed !== Infinity) {
        const [{ value: divCount }] = await db
          .select({ value: count() })
          .from(tournamentClasses)
          .where(eq(tournamentClasses.tournamentId, tournament.id));
        if (Number(divCount) > maxDivAllowed) {
          return NextResponse.json(
            { error: "extras_overdue", message: "Unpaid extra divisions. Please pay the extras invoice before opening registration." },
            { status: 402 }
          );
        }
      }
    }
  }

  // ── Publish gate: Free plan allows only 1 active (registrationOpen) tournament ──
  if (tournamentFields.registrationOpen === true) {
    const effectivePlan = getEffectivePlan(
      (tournament.plan as TournamentPlan) ?? "free",
      undefined
    );
    if (effectivePlan === "free") {
      const [{ value: activeCount }] = await db
        .select({ value: count() })
        .from(tournaments)
        .where(and(
          eq(tournaments.organizationId, tournament.organizationId),
          eq(tournaments.registrationOpen, true),
          isNull(tournaments.deletedAt),
          ne(tournaments.id, tournament.id),
        ));
      if (Number(activeCount) > 0) {
        return NextResponse.json(
          {
            error: "active_tournament_limit",
            message: "Free plan allows only 1 active tournament. Upgrade to Starter, Pro or Elite to run multiple tournaments simultaneously.",
          },
          { status: 402 }
        );
      }
    }
  }

  // ── Close-registration gate: block if unpaid extra teams ──────────
  if (tournamentFields.registrationOpen === false && tournament) {
    const ep = getEffectivePlan((tournament.plan as TournamentPlan) ?? "free", undefined);
    const pricePerExtra = PLAN_LIMITS[ep].extraTeamPriceEur;
    if (pricePerExtra > 0) {
      const [{ value: regCount }] = await db
        .select({ value: count() })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, tournament.id));
      const actual = Number(regCount ?? 0);
      const base   = PLAN_LIMITS[ep].maxTeams;
      const paid   = (tournament as { extraTeamsPurchased?: number }).extraTeamsPurchased ?? 0;
      const owed   = Math.max(0, actual - base - paid);
      if (owed > 0) {
        const owedCents = owed * pricePerExtra * 100;
        return NextResponse.json(
          {
            error: "extra_teams_unpaid",
            message: `You have ${owed} extra team(s) that haven't been paid for (€${(owedCents / 100).toFixed(2)} total). Please pay the extras invoice before closing registration.`,
            owed,
            owedCents,
          },
          { status: 402 }
        );
      }
    }
  }

  // Update tournament fields
  if (Object.keys(tournamentFields).length > 0) {
    tournamentFields.updatedAt = new Date();
    // Convert date strings to Date objects (JSON has no Date type)
    for (const dateField of ["startDate", "endDate", "registrationDeadline", "planOverrideAt"] as const) {
      if (typeof tournamentFields[dateField] === "string" && tournamentFields[dateField]) {
        tournamentFields[dateField] = new Date(tournamentFields[dateField]);
      } else if (tournamentFields[dateField] === "") {
        tournamentFields[dateField] = null;
      }
    }
    await db
      .update(tournaments)
      .set(tournamentFields)
      .where(eq(tournaments.id, tournament.id));
  }

  // Upsert / delete classes
  if (Array.isArray(classes)) {
    for (const cls of classes) {
      // DELETE — class marked for removal
      if (cls._deleted) {
        if (cls.id) {
          await db.delete(tournamentClasses).where(eq(tournamentClasses.id, cls.id));
        }
        continue;
      }
      // UPDATE existing
      if (cls.id) {
        await db
          .update(tournamentClasses)
          .set({
            name: cls.name,
            format: cls.format ?? null,
            minBirthYear: cls.minBirthYear,
            maxBirthYear: cls.maxBirthYear,
            maxTeams: cls.maxTeams ?? null,
            maxPlayers: cls.maxPlayers,
            maxStaff: cls.maxStaff,
            startDate: cls.startDate ?? null,
            endDate:   cls.endDate   ?? null,
          })
          .where(eq(tournamentClasses.id, cls.id));
      } else {
        // INSERT new
        await db.insert(tournamentClasses).values({
          tournamentId: tournament.id,
          name: cls.name,
          format: cls.format ?? null,
          minBirthYear: cls.minBirthYear,
          maxBirthYear: cls.maxBirthYear,
          maxTeams: cls.maxTeams ?? null,
          maxPlayers: cls.maxPlayers,
          maxStaff: cls.maxStaff,
          startDate: cls.startDate ?? null,
          endDate:   cls.endDate   ?? null,
        });
      }
    }
  }

  // Upsert / delete products
  if (Array.isArray(products)) {
    for (const prod of products) {
      if (prod._deleted) {
        if (prod.id) {
          await db.delete(tournamentProducts).where(eq(tournamentProducts.id, prod.id));
        }
        continue;
      }
      if (prod.id) {
        await db
          .update(tournamentProducts)
          .set({
            name: prod.name,
            nameRu: prod.nameRu,
            nameEt: prod.nameEt,
            description: prod.description,
            descriptionRu: prod.descriptionRu,
            descriptionEt: prod.descriptionEt,
            price: String(prod.price),
            currency: prod.currency,
            category: prod.category,
            isRequired: prod.isRequired,
            includedQuantity: prod.includedQuantity,
            perPerson: prod.perPerson,
            sortOrder: prod.sortOrder,
          })
          .where(eq(tournamentProducts.id, prod.id));
      } else {
        await db.insert(tournamentProducts).values({
          tournamentId: tournament.id,
          name: prod.name,
          nameRu: prod.nameRu,
          nameEt: prod.nameEt,
          description: prod.description,
          descriptionRu: prod.descriptionRu,
          descriptionEt: prod.descriptionEt,
          price: String(prod.price),
          currency: prod.currency ?? "EUR",
          category: prod.category,
          isRequired: prod.isRequired ?? false,
          includedQuantity: prod.includedQuantity ?? 0,
          perPerson: prod.perPerson ?? false,
          sortOrder: prod.sortOrder ?? 0,
        });
      }
    }
  }

  // Return updated tournament
  const updated = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournament.id),
  });

  const updatedClasses = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, tournament.id),
  });

  const updatedProducts = await db.query.tournamentProducts.findMany({
    where: eq(tournamentProducts.tournamentId, tournament.id),
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });

  return NextResponse.json({
    ...updated,
    classes: updatedClasses,
    products: updatedProducts,
  });
}
