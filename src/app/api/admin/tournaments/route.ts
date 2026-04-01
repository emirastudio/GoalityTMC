import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournaments,
  tournamentClasses,
  tournamentProducts,
} from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
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
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { classes, products, ...tournamentFields } = body;

  // Update tournament fields
  if (Object.keys(tournamentFields).length > 0) {
    tournamentFields.updatedAt = new Date();
    await db
      .update(tournaments)
      .set(tournamentFields)
      .where(eq(tournaments.id, tournament.id));
  }

  // Upsert classes
  if (Array.isArray(classes)) {
    for (const cls of classes) {
      if (cls.id) {
        await db
          .update(tournamentClasses)
          .set({
            name: cls.name,
            format: cls.format ?? null,
            minBirthYear: cls.minBirthYear,
            maxBirthYear: cls.maxBirthYear,
            maxPlayers: cls.maxPlayers,
            maxStaff: cls.maxStaff,
          })
          .where(eq(tournamentClasses.id, cls.id));
      } else {
        await db.insert(tournamentClasses).values({
          tournamentId: tournament.id,
          name: cls.name,
          format: cls.format ?? null,
          minBirthYear: cls.minBirthYear,
          maxBirthYear: cls.maxBirthYear,
          maxPlayers: cls.maxPlayers,
          maxStaff: cls.maxStaff,
        });
      }
    }
  }

  // Upsert products
  if (Array.isArray(products)) {
    for (const prod of products) {
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
