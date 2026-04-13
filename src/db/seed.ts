import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding Goality TMC platform...\n");

  const passwordHash = await bcrypt.hash("admin123", 12);

  // ─── 1. Create Super Admin (platform level, no organization) ───
  const [superAdmin] = await db
    .insert(schema.adminUsers)
    .values({
      email: "admin@goality.ee",
      name: "Andrei Arhipov",
      passwordHash,
      role: "super_admin",
      organizationId: null,
    })
    .onConflictDoNothing()
    .returning();
  console.log("Super Admin created:", superAdmin?.email ?? "already exists");

  // ─── 2. Create Organization: Kings Cup ───
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: "Kings Cup",
      slug: "kingscup",
      country: "Estonia",
      city: "Tallinn",
      timezone: "Europe/Tallinn",
      defaultLocale: "en",
      currency: "EUR",
      plan: "elite",
      contactEmail: "support@kingscup.ee",
      website: "https://kingscup.ee",
    })
    .onConflictDoNothing()
    .returning();

  if (!org) {
    console.log("Organization already exists, skipping...");
    await client.end();
    return;
  }
  console.log("Organization created:", org.name, `(/${org.slug})`);

  // ─── 3. Create Org Admin for Kings Cup ───
  const [orgAdmin] = await db
    .insert(schema.adminUsers)
    .values({
      email: "admin@kingscup.ee",
      name: "Kings Cup Admin",
      passwordHash,
      role: "admin",
      organizationId: org.id,
    })
    .onConflictDoNothing()
    .returning();
  console.log("Org Admin created:", orgAdmin?.email ?? "already exists");

  // ─── 4. Create Tournament ───
  const [tournament] = await db
    .insert(schema.tournaments)
    .values({
      organizationId: org.id,
      name: "Kings Cup Elite Round",
      slug: "elite-round-2026",
      year: 2026,
      description: "Kings Cup Elite Round 2026 — International youth football tournament",
      registrationOpen: true,
      currency: "EUR",
      startDate: new Date("2026-07-13"),
      endDate: new Date("2026-07-18"),
    })
    .onConflictDoNothing()
    .returning();

  if (!tournament) {
    console.log("Tournament already exists, skipping...");
    await client.end();
    return;
  }
  console.log("Tournament created:", tournament.name);

  // ─── 5. Tournament Classes ───
  const classes = await db
    .insert(schema.tournamentClasses)
    .values([
      { tournamentId: tournament.id, name: "2014", minBirthYear: 2014, maxPlayers: 20, maxStaff: 5 },
      { tournamentId: tournament.id, name: "2015", minBirthYear: 2015, maxPlayers: 20, maxStaff: 5 },
      { tournamentId: tournament.id, name: "2016", minBirthYear: 2016, maxPlayers: 20, maxStaff: 5 },
    ])
    .returning();
  console.log("Classes:", classes.map((c) => c.name).join(", "));

  // ─── 6. Products ───
  await db.insert(schema.tournamentProducts).values([
    {
      tournamentId: tournament.id,
      name: "Registration fee",
      nameRu: "Регистрационный взнос",
      nameEt: "Registreerimistasu",
      price: "150",
      category: "registration",
      isRequired: true,
      includedQuantity: 1,
      sortOrder: 1,
    },
  ]);

  // ─── 7. Services ───
  await db.insert(schema.accommodationOptions).values([
    {
      tournamentId: tournament.id,
      name: "Full stay (5 nights)",
      nameRu: "Полное проживание (5 ночей)",
      nameEt: "Täismajutus (5 ööd)",
      checkIn: new Date("2026-07-12"),
      checkOut: new Date("2026-07-17"),
      pricePerPlayer: "65",
      pricePerStaff: "75",
      pricePerAccompanying: "75",
      includedMeals: 3,
      mealNote: "Breakfast + Lunch + Dinner included",
      sortOrder: 1,
    },
  ]);

  await db.insert(schema.transferOptions).values([
    {
      tournamentId: tournament.id,
      name: "Airport ↔ Hotel",
      nameRu: "Аэропорт ↔ Отель",
      nameEt: "Lennujaam ↔ Hotell",
      pricePerPerson: "25",
      sortOrder: 1,
    },
  ]);

  await db.insert(schema.registrationFees).values({
    tournamentId: tournament.id,
    name: "Registration fee",
    nameRu: "Регистрационный взнос",
    nameEt: "Registreerimistasu",
    price: "150",
    isRequired: true,
  });

  const [pkg] = await db.insert(schema.servicePackages).values({
    tournamentId: tournament.id,
    name: "Standard Package",
    nameRu: "Стандартный пакет",
    nameEt: "Standardpakett",
    isDefault: true,
  }).returning();

  // ─── 8. Test Club + Teams ───
  const clubPasswordHash = await bcrypt.hash("club123", 12);
  const [club] = await db
    .insert(schema.clubs)
    .values({
      name: "FC Infonet",
      country: "Estonia",
      city: "Tallinn",
      contactName: "Andrei Arhipov",
      contactEmail: "arhipov.coach@gmail.com",
      contactPhone: "+372 555 1234",
    })
    .returning();

  await db.insert(schema.clubUsers).values({
    clubId: club.id,
    email: "arhipov.coach@gmail.com",
    name: "Andrei Arhipov",
    passwordHash: clubPasswordHash,
    accessLevel: "write",
  });

  const insertedTeams = await db.insert(schema.teams).values([
    { clubId: club.id, name: "FC Infonet U12" },
    { clubId: club.id, name: "FC Infonet U11" },
  ]).returning();

  // Register teams in the tournament
  await db.insert(schema.tournamentRegistrations).values([
    {
      teamId: insertedTeams[0]!.id,
      tournamentId: tournament.id,
      classId: classes[0]!.id,
      status: "open",
      regNumber: 10001,
    },
    {
      teamId: insertedTeams[1]!.id,
      tournamentId: tournament.id,
      classId: classes[1]!.id,
      status: "draft",
      regNumber: 10002,
    },
  ]);

  console.log("Club + teams created: FC Infonet");

  // ─── 9. Second Organization (demo) ───
  const [org2] = await db
    .insert(schema.organizations)
    .values({
      name: "Baltic Football League",
      slug: "baltic-league",
      country: "Latvia",
      city: "Riga",
      timezone: "Europe/Riga",
      defaultLocale: "en",
      currency: "EUR",
      plan: "starter",
      contactEmail: "info@balticleague.lv",
    })
    .returning();

  await db.insert(schema.adminUsers).values({
    email: "admin@balticleague.lv",
    name: "Baltic League Admin",
    passwordHash,
    role: "admin",
    organizationId: org2.id,
  });
  console.log("Demo org created:", org2.name);

  console.log("\n--- Seed complete! ---");
  console.log("\nLogins:");
  console.log("  Super Admin:  admin@goality.ee / admin123");
  console.log("  Org Admin:    admin@kingscup.ee / admin123");
  console.log("  Club:         arhipov.coach@gmail.com / club123");
  console.log("  Demo Org:     admin@balticleague.lv / admin123");

  await client.end();
}

seed().catch(console.error);
