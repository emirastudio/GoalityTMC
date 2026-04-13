import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { slugify, isSlugAvailable } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const { orgName, name, email, password, country, city, orgType } = await req.json();

  // Validation
  if (!orgName || !name || !email || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Check email uniqueness
  const existingUser = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email.toLowerCase()),
  });
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  // Generate slug
  let slug = slugify(orgName);
  if (!slug) slug = "org";

  // Ensure slug is unique
  let finalSlug = slug;
  let counter = 1;
  while (!(await isSlugAvailable(finalSlug))) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  // Create organization and admin in a transaction
  const passwordHash = await hashPassword(password);

  const [org] = await db
    .insert(organizations)
    .values({
      name: orgName,
      slug: finalSlug,
      country: country || null,
      city: city || null,
      contactEmail: email.toLowerCase(),
      type: orgType === "listing" ? "listing" : "managed",
    } as any)
    .returning();

  const [admin] = await db
    .insert(adminUsers)
    .values({
      organizationId: org.id,
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: "admin",
    })
    .returning();

  // Create session
  const token = createToken({
    userId: admin.id,
    role: "admin",
    organizationId: org.id,
    organizationSlug: finalSlug,
    isSuper: false,
  });

  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    orgSlug: finalSlug,
    organizationId: org.id,
  });
}
