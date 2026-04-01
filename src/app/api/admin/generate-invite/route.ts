import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isError } from "@/lib/api-auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Admin generates invite link for a club
// POST /api/admin/generate-invite { clubId: number }
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { clubId } = await req.json();

  const inviteToken = jwt.sign(
    { clubId, role: "club" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/api/auth/invite/${inviteToken}`;

  return NextResponse.json({ inviteUrl, token: inviteToken });
}
