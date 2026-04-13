import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripeMode, setStripeMode, type StripeMode } from "@/lib/stripe-mode";

// Only super admin can access this
async function checkSuperAdmin(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.isSuper) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const deny = await checkSuperAdmin(req);
  if (deny) return deny;
  return NextResponse.json({ mode: getStripeMode() });
}

export async function POST(req: NextRequest) {
  const deny = await checkSuperAdmin(req);
  if (deny) return deny;

  const body = await req.json().catch(() => null);
  const mode = body?.mode as StripeMode;
  if (mode !== "live" && mode !== "test") {
    return NextResponse.json({ error: "mode must be 'live' or 'test'" }, { status: 400 });
  }

  setStripeMode(mode);
  return NextResponse.json({ mode });
}
