import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  const [admin] = await db
    .insert(schema.adminUsers)
    .values({
      email: "admin@kingscup.ee",
      name: "Admin",
      passwordHash,
      role: "super_admin",
    })
    .onConflictDoNothing()
    .returning();
  console.log("Admin user created:", admin?.email ?? "already exists");

  // Create tournament
  const [tournament] = await db
    .insert(schema.tournaments)
    .values({
      name: "Kings Cup Elite Round",
      slug: "kings-cup-2026",
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

  // Create classes (by birth year)
  const classes = await db
    .insert(schema.tournamentClasses)
    .values([
      { tournamentId: tournament.id, name: "2014", minBirthYear: 2014, maxPlayers: 20, maxStaff: 5 },
      { tournamentId: tournament.id, name: "2015", minBirthYear: 2015, maxPlayers: 20, maxStaff: 5 },
      { tournamentId: tournament.id, name: "2016", minBirthYear: 2016, maxPlayers: 20, maxStaff: 5 },
    ])
    .returning();
  console.log("Classes created:", classes.map((c) => c.name).join(", "));

  // Create products
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
    {
      tournamentId: tournament.id,
      name: "Hotel accommodation — Players",
      nameRu: "Проживание в отеле — Игроки",
      nameEt: "Hotellimajutus — Mängijad",
      description: "Per player staying at the hotel",
      descriptionRu: "За каждого игрока, проживающего в отеле",
      descriptionEt: "Iga hotellis majutatava mängija kohta",
      price: "65",
      category: "accommodation",
      perPerson: true,
      sortOrder: 2,
    },
    {
      tournamentId: tournament.id,
      name: "Hotel accommodation — Staff",
      nameRu: "Проживание в отеле — Персонал",
      nameEt: "Hotellimajutus — Personal",
      description: "Per staff/accompanying person staying at the hotel",
      descriptionRu: "За каждого сотрудника/сопровождающего в отеле",
      descriptionEt: "Iga hotellis majutatava personali/saatja kohta",
      price: "75",
      category: "accommodation",
      perPerson: true,
      sortOrder: 3,
    },
    {
      tournamentId: tournament.id,
      name: "Airport/Station transfer",
      nameRu: "Трансфер аэропорт/вокзал",
      nameEt: "Lennujaama/jaama transfer",
      description: "Round trip transfer per person",
      descriptionRu: "Трансфер туда-обратно на человека",
      descriptionEt: "Edasi-tagasi transfer inimese kohta",
      price: "25",
      category: "transfer",
      perPerson: true,
      sortOrder: 4,
    },
    {
      tournamentId: tournament.id,
      name: "Extra meals package",
      nameRu: "Доп. питание",
      nameEt: "Lisatoidupakett",
      description: "Additional meals beyond standard tournament catering",
      descriptionRu: "Дополнительное питание сверх стандартного",
      descriptionEt: "Lisatoit standardse turniiritoitlustuse kõrval",
      price: "35",
      category: "meals",
      perPerson: true,
      sortOrder: 5,
    },
  ]);
  console.log("Products created");

  // ─── New service model ────────────────────────────────
  // Accommodation options
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
      mealNoteRu: "Завтрак + Обед + Ужин включены",
      mealNoteEt: "Hommikusöök + Lõuna + Õhtusöök sisaldub",
      sortOrder: 1,
    },
    {
      tournamentId: tournament.id,
      name: "Short stay (3 nights)",
      nameRu: "Краткое проживание (3 ночи)",
      nameEt: "Lühimajutus (3 ööd)",
      checkIn: new Date("2026-07-13"),
      checkOut: new Date("2026-07-16"),
      pricePerPlayer: "45",
      pricePerStaff: "55",
      pricePerAccompanying: "55",
      includedMeals: 3,
      mealNote: "Breakfast + Lunch + Dinner included",
      mealNoteRu: "Завтрак + Обед + Ужин включены",
      mealNoteEt: "Hommikusöök + Lõuna + Õhtusöök sisaldub",
      sortOrder: 2,
    },
  ]);
  console.log("Accommodation options created");

  // Extra meal options
  await db.insert(schema.extraMealOptions).values([
    {
      tournamentId: tournament.id,
      name: "Extra lunch",
      nameRu: "Дополнительный обед",
      nameEt: "Lisalõuna",
      description: "Additional lunch for days not covered by accommodation",
      pricePerPerson: "12",
      perDay: true,
      sortOrder: 1,
    },
    {
      tournamentId: tournament.id,
      name: "Extra dinner",
      nameRu: "Дополнительный ужин",
      nameEt: "Lisaõhtusöök",
      description: "Additional dinner for days not covered by accommodation",
      pricePerPerson: "15",
      perDay: true,
      sortOrder: 2,
    },
  ]);
  console.log("Extra meal options created");

  // Transfer options
  await db.insert(schema.transferOptions).values([
    {
      tournamentId: tournament.id,
      name: "Self-organized",
      nameRu: "Самостоятельно",
      nameEt: "Iseorganiseeritud",
      description: "No transfer needed — team arranges own transport",
      descriptionRu: "Трансфер не нужен — команда добирается самостоятельно",
      pricePerPerson: "0",
      sortOrder: 1,
    },
    {
      tournamentId: tournament.id,
      name: "Airport ↔ Hotel",
      nameRu: "Аэропорт ↔ Отель",
      nameEt: "Lennujaam ↔ Hotell",
      description: "Pick-up from airport/station to hotel and back",
      descriptionRu: "Встреча в аэропорту/вокзале, доставка в отель и обратно",
      pricePerPerson: "25",
      sortOrder: 2,
    },
    {
      tournamentId: tournament.id,
      name: "Full transfer",
      nameRu: "Полный трансфер",
      nameEt: "Täistransfer",
      description: "Airport ↔ Hotel + Hotel ↔ Stadium for all match days",
      descriptionRu: "Аэропорт ↔ Отель + Отель ↔ Стадион на все дни матчей",
      pricePerPerson: "50",
      sortOrder: 3,
    },
  ]);
  console.log("Transfer options created");

  // Registration fee
  await db.insert(schema.registrationFees).values({
    tournamentId: tournament.id,
    name: "Registration fee",
    nameRu: "Регистрационный взнос",
    nameEt: "Registreerimistasu",
    price: "150",
    isRequired: true,
  });
  console.log("Registration fee created");

  // Default service package
  const [pkg] = await db.insert(schema.servicePackages).values({
    tournamentId: tournament.id,
    name: "Standard Package",
    nameRu: "Стандартный пакет",
    nameEt: "Standardpakett",
    description: "Full accommodation, meals, and transfer options",
    isDefault: true,
  }).returning();
  console.log("Service package created:", pkg.name);

  // Create a test club
  const clubPasswordHash = await bcrypt.hash("club123", 12);
  const [club] = await db
    .insert(schema.clubs)
    .values({
      tournamentId: tournament.id,
      name: "FC Infonet",
      country: "Estonia",
      city: "Tallinn",
      contactName: "Andrei Arhipov",
      contactEmail: "arhipov.coach@gmail.com",
      contactPhone: "+372 555 1234",
    })
    .returning();
  console.log("Club created:", club.name);

  // Create club user
  await db.insert(schema.clubUsers).values({
    clubId: club.id,
    email: "arhipov.coach@gmail.com",
    name: "Andrei Arhipov",
    passwordHash: clubPasswordHash,
    accessLevel: "write",
  });
  console.log("Club user created");

  // Create two teams for the club
  const [team1] = await db
    .insert(schema.teams)
    .values({
      tournamentId: tournament.id,
      clubId: club.id,
      classId: classes[0]!.id,
      name: "FC Infonet U12",
      status: "open",
      regNumber: 10001,
    })
    .returning();

  const [team2] = await db
    .insert(schema.teams)
    .values({
      tournamentId: tournament.id,
      clubId: club.id,
      classId: classes[1]!.id,
      name: "FC Infonet U11",
      status: "draft",
      regNumber: 10002,
    })
    .returning();
  console.log("Teams created:", team1.name, team2.name);

  console.log("\nSeed complete!");
  console.log("Admin login: admin@kingscup.ee / admin123");
  console.log("Club login: arhipov.coach@gmail.com / club123");

  await client.end();
}

seed().catch(console.error);
