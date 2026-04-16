/**
 * POST /api/draw/upload-logo — multipart upload endpoint for the
 * standalone /draw wizard.
 *
 * Stores rasters (png/jpg/webp/gif) on disk under public/uploads/
 * draw-logos/ with a short random filename and returns the public
 * URL the wizard writes into the team/tournament logo field.
 *
 * Design notes:
 *   • Uses Next.js built-in FormData API — no external multipart
 *     parser — so the route stays dependency-free.
 *   • SVG is rejected: its XML nature opens the door for embedded
 *     <script> payloads when served from our origin. Rasters only.
 *   • 2 MB cap is generous for a logo and shuts the door on abuse.
 *   • Filenames use our short-id alphabet so they round-trip through
 *     URLs without %-encoding. No sequential ids → no enumeration.
 *
 * The target folder is served by Next as /uploads/draw-logos/*, so
 * the returned URL works immediately. deploy.sh rsync preserves the
 * folder contents between deploys (no --delete flag).
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateShortId } from "@/lib/draw-show/short-id";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "draw-logos");
const PUBLIC_PREFIX = "/uploads/draw-logos";

// Raster formats only — see module header for why SVG is off-limits.
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file_field_required" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_BYTES },
      { status: 413 },
    );
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      {
        error: "unsupported_type",
        type: file.type,
        allowed: Object.keys(ALLOWED),
      },
      { status: 415 },
    );
  }

  // Ensure the target directory exists. `recursive: true` makes this
  // idempotent across container restarts / fresh deploys.
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (e) {
    console.error("upload-logo mkdir failed", e);
    return NextResponse.json({ error: "io_error" }, { status: 500 });
  }

  const filename = `${generateShortId()}${generateShortId()}.${ext}`; // 12 chars
  const diskPath = path.join(UPLOAD_DIR, filename);
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, bytes);
  } catch (e) {
    console.error("upload-logo writeFile failed", e);
    return NextResponse.json({ error: "io_error" }, { status: 500 });
  }

  const url = `${PUBLIC_PREFIX}/${filename}`;
  return NextResponse.json({ url, bytes: file.size, type: file.type });
}
