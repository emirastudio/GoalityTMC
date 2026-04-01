import { NextResponse } from "next/server";
import { db } from "@/db";
import { registrationAttempts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(registrationAttempts)
    .orderBy(desc(registrationAttempts.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
