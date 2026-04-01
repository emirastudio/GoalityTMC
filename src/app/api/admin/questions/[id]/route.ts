import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamQuestions } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { id } = await params;
  const questionId = parseInt(id);

  const question = await db.query.teamQuestions.findFirst({
    where: eq(teamQuestions.id, questionId),
  });
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  if (body.replyBody !== undefined) {
    // Save reply
    const [updated] = await db
      .update(teamQuestions)
      .set({
        replyBody: body.replyBody,
        repliedAt: new Date(),
        repliedBy: session.userId,
        isRead: true,
      })
      .where(eq(teamQuestions.id, questionId))
      .returning();
    return NextResponse.json(updated);
  }

  if (body.isRead !== undefined) {
    const [updated] = await db
      .update(teamQuestions)
      .set({ isRead: body.isRead })
      .where(eq(teamQuestions.id, questionId))
      .returning();
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}
