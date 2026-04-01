import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  decimal,
  pgEnum,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────

export const orgPlanEnum = pgEnum("org_plan", ["free", "basic", "premium"]);

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
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
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
  registrationOpen: boolean("registration_open").default(false).notNull(),
  registrationDeadline: timestamp("registration_deadline"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  currency: text("currency").default("EUR").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("tournaments_org_slug_idx").on(table.organizationId, table.slug),
]);

// ─── Tournament Classes ─────────────────────────────────
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tournament Fields (football pitches / venues) ──────
export const tournamentFields = pgTable("tournament_fields", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),           // "База Спартак", "Стадион А"
  address: text("address"),
  mapUrl: text("map_url"),                // Google Maps link
  scheduleUrl: text("schedule_url"),      // Link to schedule/buses
  notes: text("notes"),                   // Any extra info
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// ─── Clubs (1 club = N teams) ───────────────────────────
export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  country: text("country"),
  city: text("city"),
  badgeUrl: text("badge_url"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
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

// ─── Teams (belongs to a club) ──────────────────────────
export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id")
      .references(() => tournaments.id, { onDelete: "cascade" })
      .notNull(),
    clubId: integer("club_id")
      .references(() => clubs.id, { onDelete: "cascade" }),
    classId: integer("class_id").references(() => tournamentClasses.id),
    name: text("name"),
    status: teamStatusEnum("status").default("draft").notNull(),
    regNumber: integer("reg_number").notNull(),
    notes: text("notes"), // admin notes about this team
    hotelId: integer("hotel_id"), // assigned hotel (references tournament_hotels)
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
  },
  (table) => [
    uniqueIndex("teams_tournament_reg_idx").on(
      table.tournamentId,
      table.regNumber
    ),
  ]
);

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

// ─── Team Price Overrides (custom pricing per team) ─────
// Admin can override base tournament product prices per team
export const teamPriceOverrides = pgTable("team_price_overrides", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
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
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
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
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
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
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
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
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

// Message recipients (for targeted sends — specific teams)
export const messageRecipients = pgTable("message_recipients", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => inboxMessages.id, { onDelete: "cascade" }),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
});

// Questions from teams to admin
export const teamQuestions = pgTable("team_questions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
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

// ─── Package Assignments (package → team) ───────────────
export const packageAssignments = pgTable("package_assignments", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
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

// ─── Team Service Overrides (per-team custom pricing) ───
export const teamServiceOverrides = pgTable("team_service_overrides", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
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
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
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

// ─── Team Package Overrides (per-team custom pricing) ───
// Override price of a specific package item for a specific team
export const teamPackageItemOverrides = pgTable("team_package_item_overrides", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
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
