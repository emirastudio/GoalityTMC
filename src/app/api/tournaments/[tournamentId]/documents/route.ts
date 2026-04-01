import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;

  const docs = await db.query.tournamentDocuments.findMany({
    where: eq(tournamentDocuments.tournamentId, parseInt(tournamentId)),
    orderBy: (d, { desc }) => [desc(d.uploadedAt)],
  });

  return NextResponse.json(docs);
}
