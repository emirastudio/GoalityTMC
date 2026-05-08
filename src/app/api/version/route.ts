import { NextResponse } from "next/server";

/**
 * Returns the deployed commit SHA + build timestamp.
 *
 * Public endpoint — used by deploy.yml's smoke check to verify the
 * NEW build is actually serving (not a stale orphan process responding
 * to the same port). Health monitors can check this matches the
 * expected SHA.
 *
 * The SHA is injected at build time via NEXT_PUBLIC_DEPLOY_SHA env var,
 * falling back to "unknown" if absent (e.g. local dev).
 */
export async function GET() {
  return NextResponse.json({
    sha: process.env.NEXT_PUBLIC_DEPLOY_SHA ?? "unknown",
    builtAt: process.env.NEXT_PUBLIC_BUILT_AT ?? "unknown",
    runtime: "node",
  });
}
