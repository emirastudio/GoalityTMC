import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  serial,
  decimal,
  pgEnum,
  uniqueIndex,
  index,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────

export const orgPlanEnum = pgEnum("org_plan", ["free", "starter", "pro", "elite"]);
export const tournamentPlanEnum = pgEnum("tournament_plan", ["free", "starter", "pro", "elite"]);
export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published", "archived"]);
export const eliteSubStatusEnum = pgEnum("elite_sub_status", ["active", "trialing", "past_due", "cancelled"]);
export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "completed", "refunded", "expired"]);

export const teamGenderEnum = pgEnum("team_gender", ["male", "female", "mixed"]);

export const teamStatusEnum = pgEnum("team_status", [
  "draft",
  "open",
  "confirmed",
  "cancelled",
]);

export const accessLevelEnum = pgEnum("access_level", ["read", "write"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "received",
  "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "bank_transfer",
  "stripe",
  "cash",
]);

export const adminRoleEnum = pgEnum("admin_role", ["super_admin", "admin"]);

export const personTypeEnum = pgEnum("person_type", [
  "player",
  "staff",
  "accompanying",
]);

export const serviceTypeEnum = pgEnum("service_type", [
  "accommodation",
  "meal",
  "transfer",
  "registration",
]);

export const bookingTypeEnum = pgEnum("booking_type", [
  "accommodation",
  "meal",
  "transfer",
  "registration",
  "custom",
]);

// ─── Organizations (multi-tenant) ──────────────────────
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logo: text("logo"),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  timezone: varchar("timezone", { length: 50 }).default("Europe/Tallinn").notNull(),
  defaultLocale: varchar("default_locale", { length: 5 }).default("en").notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  plan: orgPlanEnum("plan").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  eliteSubId: text("elite_sub_id"),
  eliteSubStatus: eliteSubStatusEnum("elite_sub_status"),
  eliteSubPeriodEnd: timestamp("elite_sub_period_end"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  brandColor: varchar("brand_color", { length: 20 }).default("#272D2D"),
  type: varchar("type", { length: 20 }).default("managed").notNull(), // "managed" | "listing"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Tournaments ────────────────────────────────────────
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  year: integer("year").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  cardImageUrl: text("card_image_url"),
  registrationOpen: boolean("registration_open").default(false).notNull(),
  registrationDeadline: timestamp("registration_deadline"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  currency: text("currency").default("EUR").notNull(),
  // ── Location & onboarding ───────────────────────────────
  country: text("country"),
  city: text("city"),
  specificDays: text("specific_days"),       // JSON: string[] of "YYYY-MM-DD"
  hasAccommodation: boolean("has_accommodation").default(false).notNull(),
  hasMeals: boolean("has_meals").default(false).notNull(),
  hasTransfer: boolean("has_transfer").default(false).notNull(),
  // ── Plan & billing ──────────────────────────────────────
  plan: tournamentPlanEnum("plan").default("free").notNull(),
  extraTeamsPurchased: integer("extra_teams_purchased").default(0).notNull(),
  extraDivisionsPurchased: integer("extra_divisions_purchased").default(0).notNull(),
  planOverrideBy: integer("plan_override_by").references(() => adminUsers.id, { onDelete: "set null" }),
  planOverrideReason: text("plan_override_reason"),
  planOverrideAt: timestamp("plan_override_at"),
  // ── Deferred billing deadline ────────────────────────────
  // Set to end-of-month when organizer creates extra (paid) divisions beyond plan limit.
  // Cleared when extras are paid. Publish is blocked if this date is in the past and extrasOwed > 0.
  extrasPaymentDue: date("extras_payment_due"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // ── Schedule publish ────────────────────────────────────
  // When set, the schedule is visible on public pages and in club admin.
  // Before publishing, only the organizer can see it in the planner.
  schedulePublishedAt: timestamp("schedule_published_at"),
  // ── Deletion flow ───────────────────────────────────────
  deleteRequestedAt: timestamp("delete_requested_at"),   // organizer requested → superadmin decides
  deleteRequestReason: text("delete_request_reason"),
  deletedAt: timestamp("deleted_at"),                    // superadmin approved → soft delete (30 days)
}, (table) => [
  uniqueIndex("tournaments_org_slug_idx").on(table.organizationId, table.slug),
]);

// ─── Tournament Classes ─────────────────────────────────

export type DayScheduleEntry = {
  date: string;           // "2026-08-14"
  startTime: string;      // "09:00"
  endTime: string;        // "18:00"
};

export type FieldDayScheduleEntry = {
  fieldId: number;
  date: string;           // "2026-08-14"
  startTime: string | null;  // null = closed
  endTime: string | null;
};

export type ScheduleConfig = {
  fieldIds: number[];
  dailyStartTime: string;           // "09:00" — global default
  dailyEndTime: string;             // "18:00" — global default
  halvesCount: 1 | 2;              // number of halves per match
  halfDurationMinutes: number;      // duration of each half
  breakBetweenHalvesMinutes: number;// break between halves (only used when halvesCount=2)
  breakBetweenMatchesMinutes: number;// break between games
  maxMatchesPerTeamPerDay: number;
  minRestBetweenTeamMatchesMinutes: number; // мин. отдых между матчами одной команды
  enableTeamRestRule?: boolean;     // toggle: enforce team rest rule

  // Per-day time overrides (overrides dailyStart/End for that day)
  daySchedule?: DayScheduleEntry[];

  // Per-field per-day overrides (overrides daySchedule for that field+day; null = field closed)
  fieldDaySchedule?: FieldDayScheduleEntry[];

  // Per-stadium per-day overrides (ONE TRUTH source for schedule generation)
  stadiumDaySchedule?: Array<{
    stadiumId: number;
    date: string;        // "2026-08-14"
    startTime: string | null;  // null = стадион закрыт
    endTime: string | null;
  }>;

  // Field → allowed stage IDs. Key = fieldId as string. Empty array = all stages allowed.
  fieldStageIds?: Record<string, number[]>;

  /** @deprecated use halvesCount * halfDurationMinutes + ... instead */
  matchDurationMinutes?: number;

  // ─── Scheduling v2 additions ───────────────────────────
  /** Soft-constraint weights used by the LNS solver. Higher = stronger pull. */
  weights?: {
    fieldUtilization?: number;            // default 0.5
    teamRestComfort?: number;             // default 0.8
    homeAwayBalance?: number;             // default 0.3
    primetimeForBigMatches?: number;      // default 0.2
    groupFieldAffinity?: number;          // default 0.6
    refereeWorkloadBalance?: number;      // default 0.5
    travelMinimization?: number;          // default 0.2
    dayLoadBalance?: number;              // default 0.3
  };
  /** Warmup minutes added before a match's half-times (0 = none). */
  bufferBeforeMinutes?: number;
  /** Cleanup minutes added after a match (0 = none). */
  bufferAfterMinutes?: number;
  /** If true, multiple tours of the same group may run in parallel on different fields. */
  allowParallelGroupRounds?: boolean;
  /** How strictly a group's matches must stay on one field. */
  groupFieldAffinity?: "strict" | "preferred" | "none";
  /** Discretization for slot pool in minutes (default 5). Smaller = slower, better. */
  slotGranularityMinutes?: number;
};

export const tournamentClasses = pgTable("tournament_classes", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  format: text("format"), // "5x5", "6x6", "7x7", "8x8", "9x9", "11x11"
  minBirthYear: integer("min_birth_year"),
  maxBirthYear: integer("max_birth_year"),
  maxPlayers: integer("max_players").default(25),
  maxStaff: integer("max_staff").default(5),
  maxTeams: integer("max_teams"),
  scheduleConfig: jsonb("schedule_config").$type<ScheduleConfig | null>(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tournament Stadiums (parent venues) ─────────────────
export const tournamentStadiums = pgTable("tournament_stadiums", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),           // "Infonet Arena"
  address: text("address"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  mapsUrl: text("maps_url"),              // Google Maps link
  wazeUrl: text("waze_url"),              // Waze link
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tournament Fields (площадки — subdivisions of a stadium) ──────
export const tournamentFields = pgTable("tournament_fields", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  stadiumId: integer("stadium_id")
    .references(() => tournamentStadiums.id, { onDelete: "set null" }),
  name: text("name").notNull(),           // "A", "B", "1", "2" or standalone "База Спартак"
  // address / mapUrl kept for standalone fields (no stadium)
  address: text("address"),
  mapUrl: text("map_url"),
  scheduleUrl: text("schedule_url"),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Stadium Schedule (per-stadium opening hours per date) ──────────────────
// Позволяет задать разное время работы каждого стадиона по дням.
// Если для стадиона+даты нет записи — используется глобальное расписание дивизиона.
export const tournamentStadiumSchedule = pgTable("tournament_stadium_schedule", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  stadiumId: integer("stadium_id")
    .references(() => tournamentStadiums.id, { onDelete: "cascade" })
    .notNull(),
  date: text("date").notNull(),       // "2026-08-14"
  startTime: text("start_time"),      // "09:00" — null = стадион закрыт в этот день
  endTime: text("end_time"),          // "18:00" — null = стадион закрыт в этот день
}, (t) => [
  uniqueIndex("tournament_stadium_schedule_uniq").on(t.tournamentId, t.stadiumId, t.date),
]);

// ─── Tournament Hotels ───────────────────────────────────
export const tournamentHotels = pgTable("tournament_hotels", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  address: text("address"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tournament Products (base prices) ──────────────────
export const tournamentProducts = pgTable("tournament_products", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  nameRu: text("name_ru"),
  nameEt: text("name_et"),
  description: text("description"),
  descriptionRu: text("description_ru"),
  descriptionEt: text("description_et"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR").notNull(),
  category: text("category").notNull(), // registration, accommodation, transfer, meals, extra
  isRequired: boolean("is_required").default(false).notNull(),
  includedQuantity: integer("included_quantity").default(0).notNull(),
  perPerson: boolean("per_person").default(false).notNull(), // price is per person
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Clubs (глобальная сущность — существует независимо от турниров) ──
export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  country: text("country"),
  city: text("city"),
  badgeUrl: text("badge_url"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Club Users (login — club admin OR team manager) ───
export const clubUsers = pgTable("club_users", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id")
    .references(() => clubs.id, { onDelete: "cascade" })
    .notNull(),
  // null = клубный администратор (видит все команды)
  // число = тренер команды (видит только свою)
  teamId: integer("team_id"),
  email: text("email").notNull(),
  name: text("name"),
  passwordHash: text("password_hash"),
  accessLevel: accessLevelEnum("access_level").default("write").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Team Invites ───────────────────────────────────────
export const teamInvites = pgTable("team_invites", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id")
    .references(() => clubs.id, { onDelete: "cascade" })
    .notNull(),
  teamId: integer("team_id").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

// ─── Club Invites ───────────────────────────────────────────
// Приглашение менеджера/тренера на уровне клуба (без привязки к команде)
export const clubInvites = pgTable("club_invites", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id")
    .references(() => clubs.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  invitedEmail: text("invited_email"), // опционально — email куда слали
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

// ─── Teams (глобальная сущность — принадлежит клубу) ────────
// Команда существует независимо от турниров.
// Идентичность: клуб + год рождения + пол (неизменны).
// name — опциональный кастомный override (напр. "Академия А").
// Участие в турнире оформляется через tournament_registrations.
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id")
    .references(() => clubs.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name"),                          // кастомное название (необязательно)
  birthYear: integer("birth_year"),            // год рождения детей (null для взрослых)
  gender: teamGenderEnum("gender").default("male").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Tournament Registrations ──────────────────────────────
// Запись об участии команды в конкретном турнире+дивизионе.
// Здесь хранится всё турнирно-специфичное: номер, статус, проживание.
// squadAlias — псевдоним состава ('' = один состав, 'Black'/'White' = два).
// displayName — как команда называется именно в этом турнире.
export const tournamentRegistrations = pgTable("tournament_registrations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  classId: integer("class_id")
    .references(() => tournamentClasses.id, { onDelete: "set null" }),
  regNumber: integer("reg_number").notNull(),
  status: teamStatusEnum("status").default("draft").notNull(),
  // Псевдоним состава: '' = один состав, 'Black'/'White'/'A'/'B' = несколько
  squadAlias: text("squad_alias").default("").notNull(),
  // Название команды в рамках этого турнира (если отличается от базового)
  displayName: text("display_name"),
  notes: text("notes"),
  hotelId: integer("hotel_id"),
  accomPlayers: integer("accom_players").default(0),
  accomStaff: integer("accom_staff").default(0),
  accomAccompanying: integer("accom_accompanying").default(0),
  accomCheckIn: text("accom_check_in"),
  accomCheckOut: text("accom_check_out"),
  accomNotes: text("accom_notes"),
  accomDeclined: boolean("accom_declined").default(false).notNull(),
  accomConfirmed: boolean("accom_confirmed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("registrations_tournament_reg_idx").on(table.tournamentId, table.regNumber),
  // Уникальность: команда + турнир + псевдоним состава
  uniqueIndex("registrations_team_tournament_squad_idx").on(table.teamId, table.tournamentId, table.squadAlias),
  index("idx_registrations_tournament").on(table.tournamentId),
  index("idx_registrations_team").on(table.teamId),
  index("idx_registrations_class").on(table.classId),
]);

// teamUsers removed — login is per club via clubUsers

// ─── People (Players + Staff + Accompanying) ────────────
// One unified table with personType to distinguish
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  personType: personTypeEnum("person_type").notNull(),

  // Basic info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),

  // Player-specific
  shirtNumber: integer("shirt_number"),
  position: text("position"),

  // Staff-specific
  role: text("role"), // head coach, assistant, physio, etc.
  isResponsibleOnSite: boolean("is_responsible_on_site").default(false).notNull(),

  // Medical / dietary
  allergies: text("allergies"), // free text: "gluten, nuts"
  dietaryRequirements: text("dietary_requirements"), // vegetarian, halal, etc.
  medicalNotes: text("medical_notes"), // medications, conditions
  medicalDocumentUrl: text("medical_document_url"),

  // Hotel
  needsHotel: boolean("needs_hotel").default(false).notNull(),
  needsTransfer: boolean("needs_transfer").default(false).notNull(),

  // Visibility
  showPublicly: boolean("show_publicly").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Team Price Overrides (custom pricing per registration) ─
export const teamPriceOverrides = pgTable("team_price_overrides", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => tournamentProducts.id, { onDelete: "cascade" })
    .notNull(),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"), // "Early bird discount", "Partner club", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Orders ─────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => tournamentProducts.id)
    .notNull(),
  quantity: integer("quantity").default(0).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Payments ───────────────────────────────────────────
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR").notNull(),
  method: paymentMethodEnum("method").default("bank_transfer").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Team Travel ────────────────────────────────────────
export const teamTravel = pgTable("team_travel", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  arrivalType: text("arrival_type"), // airport, port, railway, bus_station, own_bus
  arrivalDate: timestamp("arrival_date"),
  arrivalTime: text("arrival_time"),
  arrivalDetails: text("arrival_details"), // flight number, etc.
  departureType: text("departure_type"), // airport, port, railway, bus_station, own_bus
  departureDate: timestamp("departure_date"),
  departureTime: text("departure_time"),
  departureDetails: text("departure_details"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Inbox Messages ─────────────────────────────────────
export const inboxMessages = pgTable("inbox_messages", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  sentBy: integer("sent_by").notNull(),
  sendToAll: boolean("send_to_all").default(true).notNull(),
});

export const teamMessageReads = pgTable("team_message_reads", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .references(() => inboxMessages.id, { onDelete: "cascade" })
    .notNull(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

// Message recipients (for targeted sends — specific registrations)
export const messageRecipients = pgTable("message_recipients", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => inboxMessages.id, { onDelete: "cascade" }),
  registrationId: integer("registration_id").notNull().references(() => tournamentRegistrations.id, { onDelete: "cascade" }),
});

// Questions from teams to admin
export const teamQuestions = pgTable("team_questions", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id").notNull().references(() => tournamentRegistrations.id, { onDelete: "cascade" }),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  replyBody: text("reply_body"),
  repliedAt: timestamp("replied_at"),
  repliedBy: integer("replied_by"),
  isRead: boolean("is_read").default(false).notNull(),
});

// ─── Tournament Documents (admin uploads, visible to all teams) ─
export const tournamentDocuments = pgTable("tournament_documents", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  nameRu: text("name_ru"),
  nameEt: text("name_et"),
  fileUrl: text("file_url").notNull(),
  fileSize: text("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// ─── Tournament Info ────────────────────────────────────
export const tournamentInfo = pgTable("tournament_info", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  scheduleUrl: text("schedule_url"),
  scheduleDescription: text("schedule_description"),
  hotelName: text("hotel_name"),
  hotelAddress: text("hotel_address"),
  hotelCheckIn: text("hotel_check_in"),
  hotelCheckOut: text("hotel_check_out"),
  hotelNotes: text("hotel_notes"),
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  venueMapUrl: text("venue_map_url"),
  mealTimes: text("meal_times"),
  mealLocation: text("meal_location"),
  mealNotes: text("meal_notes"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  additionalNotes: text("additional_notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Service Packages ───────────────────────────────────
export const servicePackages = pgTable("service_packages", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  nameRu: text("name_ru"),
  nameEt: text("name_et"),
  description: text("description"),
  descriptionRu: text("description_ru"),
  descriptionEt: text("description_et"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Accommodation Options ──────────────────────────────
export const accommodationOptions = pgTable("accommodation_options", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  nameRu: text("name_ru"),
  nameEt: text("name_et"),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  pricePerPlayer: decimal("price_per_player", { precision: 10, scale: 2 }).notNull(),
  pricePerStaff: decimal("price_per_staff", { precision: 10, scale: 2 }).notNull(),
  pricePerAccompanying: decimal("price_per_accompanying", { precision: 10, scale: 2 }).default("0").notNull(),
  includedMeals: integer("included_meals").default(0).notNull(),
  mealNote: text("meal_note"),
  mealNoteRu: text("meal_note_ru"),
  mealNoteEt: text("meal_note_et"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Extra Meal Options ─────────────────────────────────
export const extraMealOptions = pgTable("extra_meal_options", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  nameRu: text("name_ru"),
  nameEt: text("name_et"),
  description: text("description"),
  descriptionRu: text("description_ru"),
  descriptionEt: text("description_et"),
  pricePerPerson: decimal("price_per_person", { precision: 10, scale: 2 }).notNull(),
  perDay: boolean("per_day").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Transfer Options ───────────────────────────────────
export const transferOptions = pgTable("transfer_options", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  nameRu: text("name_ru"),
  nameEt: text("name_et"),
  description: text("description"),
  descriptionRu: text("description_ru"),
  descriptionEt: text("description_et"),
  pricePerPerson: decimal("price_per_person", { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Registration Fee ───────────────────────────────────
export const registrationFees = pgTable("registration_fees", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").default("Registration fee").notNull(),
  nameRu: text("name_ru"),
  nameEt: text("name_et"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isRequired: boolean("is_required").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Package Assignments (package → registration) ────────
export const packageAssignments = pgTable("package_assignments", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  packageId: integer("package_id")
    .references(() => servicePackages.id, { onDelete: "cascade" })
    .notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: integer("assigned_by"),
  isPublished: boolean("is_published").default(false).notNull(),
  freePlayersCount: integer("free_players_count").default(0).notNull(),
  freeStaffCount: integer("free_staff_count").default(0).notNull(),
  freeAccompanyingCount: integer("free_accompanying_count").default(0).notNull(),
  mealsCountOverride: integer("meals_count_override"),
});

// ─── Team Service Overrides (per-registration custom pricing) ─
export const teamServiceOverrides = pgTable("team_service_overrides", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  serviceId: integer("service_id").notNull(),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }),
  isDisabled: boolean("is_disabled").default(false).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Team Bookings (replaces orders for new model) ──────
export const teamBookings = pgTable("team_bookings", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  bookingType: bookingTypeEnum("booking_type").notNull(),
  serviceId: integer("service_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// NEW FLEXIBLE SERVICES & PACKAGES MODEL
// ═══════════════════════════════════════════════════════════

export const pricingModeEnum = pgEnum("pricing_mode", [
  "per_person",          // price × total people
  "per_player",          // price × players count
  "per_staff",           // price × staff count
  "per_accompanying",    // price × accompanying count
  "per_team",            // fixed price per team
  "per_person_per_day",  // price × people × days
  "per_unit",            // price × custom quantity
  "flat",                // fixed amount (organizer enters total)
]);

// ─── Services (type catalog — just names) ──────────────
// Organizer creates service types: "Accommodation", "Meals", "Transfer", etc.
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  nameRu: text("name_ru"),
  nameEt: text("name_et"),
  icon: text("icon"),             // optional icon name (lucide)
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Package Items (service configured in a package) ────
// Each item = a service type + specific conditions + pricing
export const packageItems = pgTable("package_items", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id")
    .references(() => servicePackages.id, { onDelete: "cascade" })
    .notNull(),
  serviceId: integer("service_id")
    .references(() => services.id, { onDelete: "cascade" })
    .notNull(),
  // Conditions / details (free text describing specifics)
  details: text("details"),           // "Hotel Hilton, 5 nights"
  detailsRu: text("details_ru"),
  detailsEt: text("details_et"),
  // Date range (e.g. check-in / check-out, transfer date)
  dateFrom: date("date_from"),
  dateTo: date("date_to"),
  // Media
  imageUrl: text("image_url"),        // thumbnail shown in client-facing view
  // Note visible to clubs (e.g. "Breakfast included", "Non-refundable")
  note: text("note"),
  noteRu: text("note_ru"),
  noteEt: text("note_et"),
  // Pricing
  pricingMode: pricingModeEnum("pricing_mode").default("per_person").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0").notNull(),
  // Extra params for complex pricing
  days: integer("days"),              // for per_person_per_day mode
  quantity: integer("quantity"),      // for per_unit mode (default qty)
  // Display
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Team Package Overrides (per-registration custom pricing) ─
export const teamPackageItemOverrides = pgTable("team_package_item_overrides", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => tournamentRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  packageItemId: integer("package_item_id")
    .references(() => packageItems.id, { onDelete: "cascade" })
    .notNull(),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }),
  customQuantity: integer("custom_quantity"),   // override quantity
  isDisabled: boolean("is_disabled").default(false).notNull(),  // exclude this item
  reason: text("reason"),             // "Early bird discount", "VIP bonus"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Admin Users ────────────────────────────────────────
// organizationId = null → platform super admin (sees everything)
// organizationId = N   → org admin (sees only their org)
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRoleEnum("role").default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// GAME LOGIC — Матчи, этапы, результаты, протоколы
// ═══════════════════════════════════════════════════════════

// ─── Enums ─────────────────────────────────────────────────

export const stageTypeEnum = pgEnum("stage_type", [
  "group",       // круговой внутри групп
  "knockout",    // плей-офф на вылет
  "league",      // все со всеми (чемпионат)
  "swiss",       // швейцарская система
  "double_elim", // двойное выбывание
]);

export const stageStatusEnum = pgEnum("stage_status", [
  "pending",   // ещё не начался
  "active",    // идёт
  "finished",  // завершён
]);

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",  // запланирован
  "live",       // идёт прямо сейчас
  "finished",   // завершён
  "postponed",  // перенесён
  "cancelled",  // отменён
  "walkover",   // технический результат
]);

export const matchResultTypeEnum = pgEnum("match_result_type", [
  "regular",    // основное время
  "extra_time", // экстра-тайм
  "penalties",  // пенальти
  "walkover",   // технический
  "technical",  // дисквалификация
]);

export const matchEventTypeEnum = pgEnum("match_event_type", [
  "goal",
  "own_goal",
  "yellow",
  "red",
  "yellow_red",
  "penalty_scored",
  "penalty_missed",
  "substitution_in",
  "substitution_out",
  "injury",
  "var",
]);

// ─── Этапы турнира ─────────────────────────────────────────
// Каждый турнир состоит из 1+ этапов (групповой → плей-офф)

export const tournamentStages = pgTable("tournament_stages", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  nameRu: varchar("name_ru", { length: 100 }),
  nameEt: varchar("name_et", { length: 100 }),
  type: stageTypeEnum("type").notNull(),
  order: integer("order").notNull(),
  status: stageStatusEnum("status").default("pending").notNull(),
  // Настройки этапа: очки за победу/ничью/поражение, длительность матча
  settings: jsonb("settings").$type<{
    pointsWin?: number;
    pointsDraw?: number;
    pointsLoss?: number;
    matchDurationMinutes?: number;
    // Ничья в плей-офф: как определяется победитель
    drawResolution?: "extra_time" | "penalties" | "extra_time_then_penalties";
    extraTimeMinutes?: number;   // длительность одного тайма доп. времени
    extraTimeHalves?: number;    // кол-во таймов (обычно 2)
    hasPenalties?: boolean;
    hasExtraTime?: boolean;
    teamsCount?: number;
    groupsCount?: number;
    teamsPerGroup?: number;
  }>().default({}),
  // Порядок тайбрейков: head_to_head, goal_diff, goals_scored, away_goals, fair_play
  tiebreakers: jsonb("tiebreakers").$type<string[]>().default([
    "head_to_head_points",
    "head_to_head_goal_diff",
    "goal_diff",
    "goals_scored",
    "fair_play",
  ]),
  classId: integer("class_id").references(() => tournamentClasses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_stages_tournament").on(table.tournamentId),
  index("idx_stages_organization").on(table.organizationId),
  index("idx_stages_class").on(table.classId),
]);

// ─── Группы внутри этапа ───────────────────────────────────
// Групповой этап: группы A, B, C, D...

export const stageGroups = pgTable("stage_groups", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id")
    .references(() => tournamentStages.id, { onDelete: "cascade" })
    .notNull(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 20 }).notNull(), // "A", "B", "Group 1"
  order: integer("order").default(0).notNull(),
  targetSize: integer("target_size"), // intended team-slot count (null = use actual team count)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_stage_groups_stage").on(table.stageId),
]);

// ─── Команды в группах ─────────────────────────────────────

export const groupTeams = pgTable("group_teams", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .references(() => stageGroups.id, { onDelete: "cascade" })
    .notNull(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  seedNumber: integer("seed_number"), // 1-4 для жеребьёвки по корзинам
}, (table) => [
  uniqueIndex("idx_group_teams_unique").on(table.groupId, table.teamId),
]);

// ─── Раунды плей-офф ───────────────────────────────────────
// Финал, 1/2 финала, 1/4 финала, 1/8 финала...

export const matchRounds = pgTable("match_rounds", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id")
    .references(() => tournamentStages.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 50 }).notNull(),      // "Финал"
  nameRu: varchar("name_ru", { length: 50 }),
  nameEt: varchar("name_et", { length: 50 }),
  shortName: varchar("short_name", { length: 10 }),     // "F", "SF", "QF", "R16"
  order: integer("order").notNull(),                     // 1=финал, 2=полуфинал...
  matchCount: integer("match_count").default(1).notNull(), // 1, 2, 4, 8, 16
  isTwoLegged: boolean("is_two_legged").default(false).notNull(),
  hasThirdPlace: boolean("has_third_place").default(false).notNull(),
}, (table) => [
  index("idx_match_rounds_stage").on(table.stageId),
]);

// ─── Матчи ─────────────────────────────────────────────────
// Главная таблица игровой логики

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  stageId: integer("stage_id")
    .references(() => tournamentStages.id, { onDelete: "cascade" })
    .notNull(),
  groupId: integer("group_id")
    .references(() => stageGroups.id, { onDelete: "set null" }),    // null для плей-офф
  roundId: integer("round_id")
    .references(() => matchRounds.id, { onDelete: "set null" }),    // null для группового
  matchNumber: integer("match_number"),                              // глобальный номер
  groupRound: integer("group_round"),                                // номер тура в групповом этапе (1,2,3...) — null для плей-офф

  homeTeamId: integer("home_team_id")
    .references(() => teams.id, { onDelete: "set null" }),
  awayTeamId: integer("away_team_id")
    .references(() => teams.id, { onDelete: "set null" }),

  fieldId: integer("field_id")
    .references(() => tournamentFields.id, { onDelete: "set null" }),

  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),

  status: matchStatusEnum("status").default("scheduled").notNull(),

  // Счёт основного времени
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  // Экстра-тайм
  homeExtraScore: integer("home_extra_score"),
  awayExtraScore: integer("away_extra_score"),
  // Серия пенальти
  homePenalties: integer("home_penalties"),
  awayPenalties: integer("away_penalties"),

  winnerId: integer("winner_id")
    .references(() => teams.id, { onDelete: "set null" }),
  resultType: matchResultTypeEnum("result_type"),

  isPublic: boolean("is_public").default(true).notNull(),
  notes: text("notes"),
  version: integer("version").default(0).notNull(), // optimistic locking

  // ─── Scheduling v2 — lock semantics ───────────────
  // Pinned matches are untouchable by the solver. Stores who + why for audit.
  lockedAt: timestamp("locked_at"),
  lockedByUserId: integer("locked_by_user_id")
    .references(() => adminUsers.id, { onDelete: "set null" }),
  lockReason: text("lock_reason"),
  // Per-match buffer overrides (null = use division config default)
  bufferBeforeMinutes: integer("buffer_before_minutes"),
  bufferAfterMinutes: integer("buffer_after_minutes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),                // soft delete — никогда не удаляем
}, (table) => [
  index("idx_matches_tournament_status").on(table.tournamentId, table.status),
  index("idx_matches_org_scheduled").on(table.organizationId, table.scheduledAt),
  index("idx_matches_home_team").on(table.homeTeamId),
  index("idx_matches_away_team").on(table.awayTeamId),
  index("idx_matches_field_time").on(table.fieldId, table.scheduledAt),
  index("idx_matches_stage").on(table.stageId),
  index("idx_matches_group").on(table.groupId),
  index("idx_matches_locked").on(table.tournamentId, table.lockedAt),
]);

// ─── Протокол матча (события) ──────────────────────────────
// Голы, карточки, замены — каждое событие = строка

export const matchEvents = pgTable("match_events", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .references(() => matches.id, { onDelete: "cascade" })
    .notNull(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  personId: integer("person_id")
    .references(() => people.id, { onDelete: "set null" }),
  eventType: matchEventTypeEnum("event_type").notNull(),
  minute: integer("minute").notNull(),
  minuteExtra: integer("minute_extra"),                // 90+3 → minute=90, extra=3
  assistPersonId: integer("assist_person_id")
    .references(() => people.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_match_events_match").on(table.matchId),
  index("idx_match_events_tournament").on(table.tournamentId),
  index("idx_match_events_person").on(table.personId),
]);

// ─── Составы (заявка на матч) ───────────────────────────────

export const matchLineup = pgTable("match_lineup", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .references(() => matches.id, { onDelete: "cascade" })
    .notNull(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  personId: integer("person_id")
    .references(() => people.id, { onDelete: "cascade" })
    .notNull(),
  isStarting: boolean("is_starting").default(true).notNull(),
  shirtNumber: integer("shirt_number"),
  position: varchar("position", { length: 30 }),
  rating: decimal("rating", { precision: 3, scale: 1 }), // оценка 1.0–10.0
}, (table) => [
  uniqueIndex("idx_match_lineup_unique").on(table.matchId, table.personId),
  index("idx_match_lineup_match").on(table.matchId),
]);

// ─── Таблица группы (precomputed) ──────────────────────────
// Пересчитывается после каждого матча — не считаем на лету

export const standings = pgTable("standings", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .references(() => stageGroups.id, { onDelete: "cascade" })
    .notNull(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  played: integer("played").default(0).notNull(),
  won: integer("won").default(0).notNull(),
  drawn: integer("drawn").default(0).notNull(),
  lost: integer("lost").default(0).notNull(),
  goalsFor: integer("goals_for").default(0).notNull(),
  goalsAgainst: integer("goals_against").default(0).notNull(),
  goalDiff: integer("goal_diff").default(0).notNull(),  // goalsFor - goalsAgainst
  points: integer("points").default(0).notNull(),
  position: integer("position"),                         // место в группе (1,2,3...)
  form: jsonb("form").$type<string[]>().default([]),    // ["W","D","L","W","W"]
  headToHead: jsonb("head_to_head").$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_standings_group_team").on(table.groupId, table.teamId),
  index("idx_standings_tournament").on(table.tournamentId),
]);

// ─── Правила квалификации между этапами ────────────────────
// Топ-2 из каждой группы → плей-офф

export const qualificationRules = pgTable("qualification_rules", {
  id: serial("id").primaryKey(),
  fromStageId: integer("from_stage_id")
    .references(() => tournamentStages.id, { onDelete: "cascade" })
    .notNull(),
  targetStageId: integer("target_stage_id")
    .references(() => tournamentStages.id, { onDelete: "cascade" })
    .notNull(),
  fromRank: integer("from_rank").notNull(),              // с 1-го места
  toRank: integer("to_rank").notNull(),                  // по 2-е место
  targetSlot: varchar("target_slot", { length: 50 }),   // "winner","runner_up","best_third"
  condition: jsonb("condition").$type<Record<string, unknown>>().default({}),
});

// ─── Слоты в сетке плей-офф ────────────────────────────────
// Заполняются автоматически после завершения группового этапа

export const stageSlots = pgTable("stage_slots", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id")
    .references(() => tournamentStages.id, { onDelete: "cascade" })
    .notNull(),
  groupId: integer("group_id")
    .references(() => stageGroups.id, { onDelete: "set null" }),
  roundId: integer("round_id")
    .references(() => matchRounds.id, { onDelete: "set null" }),
  slotLabel: varchar("slot_label", { length: 100 }),    // "Победитель группы A"
  slotLabelRu: varchar("slot_label_ru", { length: 100 }),
  slotLabelEt: varchar("slot_label_et", { length: 100 }),
  slotPosition: varchar("slot_position", { length: 10 }), // "home" | "away"
  filledByTeamId: integer("filled_by_team_id")
    .references(() => teams.id, { onDelete: "set null" }),
  order: integer("order").default(0).notNull(),
}, (table) => [
  index("idx_stage_slots_stage").on(table.stageId),
]);

// ═══════════════════════════════════════════════════════════
// SCHEDULING v2 — referees, blackouts, solver runs, notifications
// ═══════════════════════════════════════════════════════════

// ─── Tournament Referees (roster per tournament) ────────────
export const tournamentReferees = pgTable("tournament_referees", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  level: text("level"),                    // "junior"|"senior"|"national" (free text)
  colorTag: text("color_tag"),             // hex color for calendar chip
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_tournament_referees_tournament").on(table.tournamentId),
]);

// ─── Referee Availability / Blackout Windows ────────────────
// isBlackout=false → "referee is available this window"
// isBlackout=true  → "referee is UNAVAILABLE this window"
// If no rows exist for a date, referee is considered available for tournament hours.
export const refereeAvailability = pgTable("referee_availability", {
  id: serial("id").primaryKey(),
  refereeId: integer("referee_id")
    .references(() => tournamentReferees.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  startTime: text("start_time"),           // "HH:MM" local, null = whole day
  endTime: text("end_time"),
  isBlackout: boolean("is_blackout").default(false).notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_referee_availability_referee").on(table.refereeId, table.date),
]);

// ─── Team Blackouts ─────────────────────────────────────────
// Travel windows, parallel-tournament conflicts, team sickness, etc.
export const teamBlackouts = pgTable("team_blackouts", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  startTime: text("start_time"),           // null = all day
  endTime: text("end_time"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_team_blackouts_tournament_date").on(table.tournamentId, table.date),
  index("idx_team_blackouts_team").on(table.teamId),
]);

// ─── Match Referees (M:N between matches and referees) ─────
export const matchReferees = pgTable("match_referees", {
  matchId: integer("match_id")
    .references(() => matches.id, { onDelete: "cascade" })
    .notNull(),
  refereeId: integer("referee_id")
    .references(() => tournamentReferees.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(),            // "main"|"assistant1"|"assistant2"|"fourth"
}, (table) => [
  uniqueIndex("idx_match_referees_pk").on(table.matchId, table.refereeId),
  index("idx_match_referees_referee").on(table.refereeId),
]);

// ─── Schedule Runs (durable state machine + audit log) ─────
// One row per solver invocation. Stores the full Problem snapshot so re-runs
// with the same seed produce identical Solutions ("deterministic replay").
// Large JSONB — result_summary is the cheap list view, result is the full blob.
export const scheduleRuns = pgTable("schedule_runs", {
  id: varchar("id", { length: 32 }).primaryKey(),   // nanoid, shareable in URLs
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  classId: integer("class_id")
    .references(() => tournamentClasses.id, { onDelete: "cascade" }),   // null = whole tournament
  parentRunId: varchar("parent_run_id", { length: 32 }),                // what-if forks (FK added via relations)
  status: text("status").notNull(),        // "queued"|"running"|"succeeded"|"failed"|"cancelled"|"applied"|"what_if"
  kind: text("kind").notNull(),            // "solve"|"what_if"|"manual_edit"
  inputHash: text("input_hash").notNull(),
  params: jsonb("params").notNull(),       // full Problem snapshot
  resultSummary: jsonb("result_summary"),  // {score, hardViolations, unplacedCount, elapsedMs}
  result: jsonb("result"),                 // full Solution (may be large, stored in TOAST)
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdByUserId: integer("created_by_user_id")
    .references(() => adminUsers.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  appliedAt: timestamp("applied_at"),
  appliedByUserId: integer("applied_by_user_id")
    .references(() => adminUsers.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_schedule_runs_tournament").on(table.tournamentId, table.createdAt),
  index("idx_schedule_runs_status").on(table.status),
  index("idx_schedule_runs_input_hash").on(table.inputHash),
]);

// ─── Notification Queue (in-process drain loop, no pg-boss) ─
// Durable queue for outgoing schedule-changed emails, etc.
// Drained by a setInterval worker started from instrumentation.ts.
export const notificationQueue = pgTable("notification_queue", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),            // "schedule_changed"|"match_locked"|"run_applied"
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  targetType: text("target_type").notNull(), // "team"|"referee"|"user"
  targetId: integer("target_id").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").default("pending").notNull(), // "pending"|"sent"|"failed"
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
}, (table) => [
  index("idx_notification_queue_pending").on(table.status, table.createdAt),
  index("idx_notification_queue_tournament").on(table.tournamentId),
]);

// ─── Audit log изменений результатов ───────────────────────
// Кто, когда и почему изменил счёт

export const matchResultLog = pgTable("match_result_log", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .references(() => matches.id, { onDelete: "cascade" })
    .notNull(),
  changedBy: integer("changed_by")
    .references(() => adminUsers.id, { onDelete: "set null" }),
  oldHomeScore: integer("old_home_score"),
  oldAwayScore: integer("old_away_score"),
  newHomeScore: integer("new_home_score"),
  newAwayScore: integer("new_away_score"),
  oldStatus: matchStatusEnum("old_status"),
  newStatus: matchStatusEnum("new_status"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_result_log_match").on(table.matchId),
]);

// ─── Registration Attempts Log ──────────────────────────────
export const registrationAttempts = pgTable("registration_attempts", {
  id: serial("id").primaryKey(),
  // What they entered
  clubName: text("club_name"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  country: text("country"),
  city: text("city"),
  teamsCount: integer("teams_count"),
  teamsJson: text("teams_json"),       // raw JSON of team names + classes
  hasLogo: boolean("has_logo").default(false),
  // Outcome
  status: text("status").notNull(),    // "success" | "fail" | "duplicate_email" | "no_tournament" | ...
  failReason: text("fail_reason"),     // human-readable reason on failure
  clubId: integer("club_id"),          // set on success
  // Request metadata
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Blog Posts (platform-level, not org-scoped) ────────────
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    status: blogPostStatusEnum("status").default("draft").notNull(),

    titleEn: text("title_en").notNull(),
    titleRu: text("title_ru"),
    contentEn: text("content_en").notNull(),
    contentRu: text("content_ru"),
    excerptEn: text("excerpt_en"),
    excerptRu: text("excerpt_ru"),

    coverImageUrl: text("cover_image_url"),
    category: varchar("category", { length: 100 }),
    tags: jsonb("tags").$type<string[]>().default([]),

    seoTitleEn: text("seo_title_en"),
    seoTitleRu: text("seo_title_ru"),
    seoDescriptionEn: text("seo_description_en"),
    seoDescriptionRu: text("seo_description_ru"),

    authorName: varchar("author_name", { length: 255 }).default("Goality Team"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_blog_status_published").on(table.status, table.publishedAt)]
);

// ═══════════════════════════════════════════════════════════
// DRIZZLE RELATIONS — для relational query API (with: {...})
// ═══════════════════════════════════════════════════════════

// ─── Monetization Tables ────────────────────────────────────

export const tournamentPurchases = pgTable("tournament_purchases", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  plan: tournamentPlanEnum("plan").notNull(),
  extraTeams: integer("extra_teams").default(0).notNull(),
  extraDivisions: integer("extra_divisions").default(0).notNull(),
  amountEurCents: integer("amount_eur_cents").notNull(),
  status: purchaseStatusEnum("status").default("pending").notNull(),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const platformSubscriptions = pgTable("platform_subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  billingInterval: text("billing_interval").notNull(),  // 'month' | 'year'
  status: eliteSubStatusEnum("status").default("active").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const planOverrideAudits = pgTable("plan_override_audits", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),  // 'tournament' | 'organization'
  entityId: integer("entity_id").notNull(),
  entityName: text("entity_name").notNull(),
  adminId: integer("admin_id").notNull().references(() => adminUsers.id),
  adminEmail: text("admin_email").notNull(),
  previousPlan: text("previous_plan").notNull(),
  newPlan: text("new_plan").notNull(),
  reason: text("reason").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(),  // Stripe event id (evt_...)
  type: text("type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  payload: jsonb("payload").notNull(),
});

// ─── Monetization Relations ──────────────────────────────────

export const tournamentPurchasesRelations = relations(tournamentPurchases, ({ one }) => ({
  tournament: one(tournaments, { fields: [tournamentPurchases.tournamentId], references: [tournaments.id] }),
  organization: one(organizations, { fields: [tournamentPurchases.organizationId], references: [organizations.id] }),
}));

export const platformSubscriptionsRelations = relations(platformSubscriptions, ({ one }) => ({
  organization: one(organizations, { fields: [platformSubscriptions.organizationId], references: [organizations.id] }),
}));

export const planOverrideAuditsRelations = relations(planOverrideAudits, ({ one }) => ({
  admin: one(adminUsers, { fields: [planOverrideAudits.adminId], references: [adminUsers.id] }),
}));

// ─── Existing tables ────────────────────────────────────────

export const clubsRelations = relations(clubs, ({ many }) => ({
  teams: many(teams),
  clubUsers: many(clubUsers),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  club: one(clubs, { fields: [teams.clubId], references: [clubs.id] }),
  registrations: many(tournamentRegistrations),
  people: many(people),
  groupTeams: many(groupTeams),
  standings: many(standings),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
}));

export const tournamentRegistrationsRelations = relations(tournamentRegistrations, ({ one, many }) => ({
  team: one(teams, { fields: [tournamentRegistrations.teamId], references: [teams.id] }),
  tournament: one(tournaments, { fields: [tournamentRegistrations.tournamentId], references: [tournaments.id] }),
  class: one(tournamentClasses, { fields: [tournamentRegistrations.classId], references: [tournamentClasses.id] }),
  payments: many(payments),
  bookings: many(teamBookings),
  orders: many(orders),
  travel: one(teamTravel),
  packageAssignment: one(packageAssignments),
  serviceOverrides: many(teamServiceOverrides),
  packageItemOverrides: many(teamPackageItemOverrides),
  messageReads: many(teamMessageReads),
  questions: many(teamQuestions),
  priceOverrides: many(teamPriceOverrides),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  team: one(teams, { fields: [people.teamId], references: [teams.id] }),
}));

export const tournamentStadiumsRelations = relations(tournamentStadiums, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [tournamentStadiums.tournamentId], references: [tournaments.id] }),
  fields: many(tournamentFields),
  schedules: many(tournamentStadiumSchedule),
}));

export const tournamentStadiumScheduleRelations = relations(tournamentStadiumSchedule, ({ one }) => ({
  tournament: one(tournaments, { fields: [tournamentStadiumSchedule.tournamentId], references: [tournaments.id] }),
  stadium: one(tournamentStadiums, { fields: [tournamentStadiumSchedule.stadiumId], references: [tournamentStadiums.id] }),
}));

export const tournamentFieldsRelations = relations(tournamentFields, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [tournamentFields.tournamentId], references: [tournaments.id] }),
  stadium: one(tournamentStadiums, { fields: [tournamentFields.stadiumId], references: [tournamentStadiums.id] }),
  matches: many(matches),
}));

// ─── Game Logic Relations ────────────────────────────────────

export const tournamentStagesRelations = relations(tournamentStages, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [tournamentStages.tournamentId], references: [tournaments.id] }),
  organization: one(organizations, { fields: [tournamentStages.organizationId], references: [organizations.id] }),
  groups: many(stageGroups),
  rounds: many(matchRounds),
  matches: many(matches),
  slots: many(stageSlots),
}));

export const stageGroupsRelations = relations(stageGroups, ({ one, many }) => ({
  stage: one(tournamentStages, { fields: [stageGroups.stageId], references: [tournamentStages.id] }),
  tournament: one(tournaments, { fields: [stageGroups.tournamentId], references: [tournaments.id] }),
  groupTeams: many(groupTeams),
  matches: many(matches),
  standings: many(standings),
  slots: many(stageSlots),
}));

export const groupTeamsRelations = relations(groupTeams, ({ one }) => ({
  group: one(stageGroups, { fields: [groupTeams.groupId], references: [stageGroups.id] }),
  team: one(teams, { fields: [groupTeams.teamId], references: [teams.id] }),
}));

export const matchRoundsRelations = relations(matchRounds, ({ one, many }) => ({
  stage: one(tournamentStages, { fields: [matchRounds.stageId], references: [tournamentStages.id] }),
  matches: many(matches),
  slots: many(stageSlots),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [matches.tournamentId], references: [tournaments.id] }),
  stage: one(tournamentStages, { fields: [matches.stageId], references: [tournamentStages.id] }),
  group: one(stageGroups, { fields: [matches.groupId], references: [stageGroups.id] }),
  round: one(matchRounds, { fields: [matches.roundId], references: [matchRounds.id] }),
  homeTeam: one(teams, { fields: [matches.homeTeamId], references: [teams.id], relationName: "homeTeam" }),
  awayTeam: one(teams, { fields: [matches.awayTeamId], references: [teams.id], relationName: "awayTeam" }),
  winner: one(teams, { fields: [matches.winnerId], references: [teams.id], relationName: "winner" }),
  field: one(tournamentFields, { fields: [matches.fieldId], references: [tournamentFields.id] }),
  events: many(matchEvents),
  lineup: many(matchLineup),
  resultLog: many(matchResultLog),
}));

export const matchEventsRelations = relations(matchEvents, ({ one }) => ({
  match: one(matches, { fields: [matchEvents.matchId], references: [matches.id] }),
  team: one(teams, { fields: [matchEvents.teamId], references: [teams.id] }),
  person: one(people, { fields: [matchEvents.personId], references: [people.id], relationName: "eventPerson" }),
  assistPerson: one(people, { fields: [matchEvents.assistPersonId], references: [people.id], relationName: "assistPerson" }),
}));

export const matchLineupRelations = relations(matchLineup, ({ one }) => ({
  match: one(matches, { fields: [matchLineup.matchId], references: [matches.id] }),
  team: one(teams, { fields: [matchLineup.teamId], references: [teams.id] }),
  person: one(people, { fields: [matchLineup.personId], references: [people.id] }),
}));

export const standingsRelations = relations(standings, ({ one }) => ({
  group: one(stageGroups, { fields: [standings.groupId], references: [stageGroups.id] }),
  tournament: one(tournaments, { fields: [standings.tournamentId], references: [tournaments.id] }),
  team: one(teams, { fields: [standings.teamId], references: [teams.id] }),
}));

export const stageSlotsRelations = relations(stageSlots, ({ one }) => ({
  stage: one(tournamentStages, { fields: [stageSlots.stageId], references: [tournamentStages.id] }),
  group: one(stageGroups, { fields: [stageSlots.groupId], references: [stageGroups.id] }),
  round: one(matchRounds, { fields: [stageSlots.roundId], references: [matchRounds.id] }),
  filledByTeam: one(teams, { fields: [stageSlots.filledByTeamId], references: [teams.id] }),
}));

export const matchResultLogRelations = relations(matchResultLog, ({ one }) => ({
  match: one(matches, { fields: [matchResultLog.matchId], references: [matches.id] }),
  changedByUser: one(adminUsers, { fields: [matchResultLog.changedBy], references: [adminUsers.id] }),
}));

// ─── Listing Tournaments ─────────────────────────────────
// Для организаторов типа "listing" — упрощённая страница турнира в каталоге
export const listingTournaments = pgTable("listing_tournaments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  country: text("country"),
  city: text("city"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  photos: text("photos").default("[]"), // JSON array of up to 5 URLs
  regulations: text("regulations"),
  formats: text("formats"),
  divisions: text("divisions"),
  pricing: text("pricing"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  ageGroups: text("age_groups").default("[]"), // JSON: [{name,gender}]
  cardImageUrl: text("card_image_url"),
  // Multi-language translations (non-EN content stored here; EN = main columns)
  translations: jsonb("translations").default({}),
  // Extra details
  venue: text("venue"),                         // specific location name / arena
  registrationDeadline: date("registration_deadline"),
  level: text("level"),                         // Local / Regional / National / International
  prizeInfo: text("prize_info"),                // prize pool / awards
  instagram: text("instagram"),
  facebook: text("facebook"),
  // Stripe subscription
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("inactive"),
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const listingTournamentsRelations = relations(listingTournaments, ({ one }) => ({
  organization: one(organizations, {
    fields: [listingTournaments.organizationId],
    references: [organizations.id],
  }),
}));

// ─── Scheduling v2 Relations ─────────────────────────────────

export const tournamentRefereesRelations = relations(tournamentReferees, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [tournamentReferees.tournamentId], references: [tournaments.id] }),
  organization: one(organizations, { fields: [tournamentReferees.organizationId], references: [organizations.id] }),
  availability: many(refereeAvailability),
  matchAssignments: many(matchReferees),
}));

export const refereeAvailabilityRelations = relations(refereeAvailability, ({ one }) => ({
  referee: one(tournamentReferees, { fields: [refereeAvailability.refereeId], references: [tournamentReferees.id] }),
}));

export const teamBlackoutsRelations = relations(teamBlackouts, ({ one }) => ({
  team: one(teams, { fields: [teamBlackouts.teamId], references: [teams.id] }),
  tournament: one(tournaments, { fields: [teamBlackouts.tournamentId], references: [tournaments.id] }),
}));

export const matchRefereesRelations = relations(matchReferees, ({ one }) => ({
  match: one(matches, { fields: [matchReferees.matchId], references: [matches.id] }),
  referee: one(tournamentReferees, { fields: [matchReferees.refereeId], references: [tournamentReferees.id] }),
}));

export const scheduleRunsRelations = relations(scheduleRuns, ({ one }) => ({
  tournament: one(tournaments, { fields: [scheduleRuns.tournamentId], references: [tournaments.id] }),
  organization: one(organizations, { fields: [scheduleRuns.organizationId], references: [organizations.id] }),
  class: one(tournamentClasses, { fields: [scheduleRuns.classId], references: [tournamentClasses.id] }),
  parentRun: one(scheduleRuns, { fields: [scheduleRuns.parentRunId], references: [scheduleRuns.id], relationName: "parentRun" }),
  createdBy: one(adminUsers, { fields: [scheduleRuns.createdByUserId], references: [adminUsers.id], relationName: "scheduleRunCreator" }),
  appliedBy: one(adminUsers, { fields: [scheduleRuns.appliedByUserId], references: [adminUsers.id], relationName: "scheduleRunApplier" }),
}));

export const notificationQueueRelations = relations(notificationQueue, ({ one }) => ({
  tournament: one(tournaments, { fields: [notificationQueue.tournamentId], references: [tournaments.id] }),
}));

// ─── Public Draws (standalone /draw share-link storage) ─────────
//
// Anonymous visitors at /draw create a draw setup in the wizard and
// need a short URL to share it with their audience/teams. Instead of
// encoding the whole state in the URL (which produces 1-2 KB base64
// blobs that don't fit in SMS or social previews), we persist the
// state here under a 6-char id and hand out a compact share URL.
//
// `state` holds the ShareableDrawState exactly as the client emits it.
// No auth, no organization link — this table is deliberately isolated
// from the tournament model. A TTL cleanup job can prune by createdAt
// if needed; for v1 we keep everything.
export const publicDraws = pgTable("public_draws", {
  id: text("id").primaryKey(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Opaque viewer counter — cheap engagement metric, non-authoritative.
  viewCount: integer("view_count").default(0).notNull(),
});
