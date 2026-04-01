import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Admin generates invite link for a club
// POST /api/admin/generate-invite { clubId: number }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
