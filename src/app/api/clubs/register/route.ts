import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, clubUsers, registrationAttempts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
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

  // Logo upload
  let badgeUrl: string | null = null;
  const hasLogo = !!(logoFile && logoFile.size > 0);
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
  const [club] = await db.insert(clubs).values({
    name: clubName, slug: `${baseSlug}-${Date.now()}`,
    country, city, badgeUrl, contactName, contactEmail, contactPhone,
  }).returning();

  // Создаём пользователя клуба
  const passwordHash = await hashPassword(password);
  await db.insert(clubUsers).values({ clubId: club.id, email: contactEmail, name: contactName, passwordHash, accessLevel: "write" });

  await logAttempt({ ...base, hasLogo, status: "success", clubId: club.id });

  // Welcome email (fire & forget)
  sendWelcomeEmail({ to: contactEmail, clubName, contactName }).catch(
    (e) => console.error("[EMAIL] Welcome send failed:", e),
  );

  // Авто-логин
  const token = createToken({ userId: club.id, role: "club", clubId: club.id });
  await setSessionCookie(token);

  console.log(`[REGISTER] SUCCESS — club="${clubName}" clubId=${club.id}`);
  return NextResponse.json({ ok: true, clubId: club.id });
}
