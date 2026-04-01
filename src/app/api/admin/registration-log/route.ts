import { NextResponse } from "next/server";
import { db } from "@/db";
import { registrationAttempts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin, isError } from "@/lib/api-auth";

export async function GET() {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const rows = await db
    .select()
    .from(registrationAttempts)
    .orderBy(desc(registrationAttempts.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
