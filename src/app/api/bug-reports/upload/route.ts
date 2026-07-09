import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrClub, isError } from "@/lib/api-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

/** POST /api/bug-reports/upload — screenshot upload for the bug reporter. Auth: any admin or club user, no tournament required. */
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "bug-reports");
const MAX_SIZE = 10 * 1024 * 1024; // 10MB — modern phone shots run 5–8 MB.
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/pjpeg",
  "image/png", "image/webp", "image/gif",
  "image/avif",
  "image/heic", "image/heif",
]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"]);

export async function POST(req: NextRequest) {
  const session = await requireAdminOrClub();
  if (isError(session)) return session;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form body" }, { status: 400 });
  }
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const typeOk = file.type ? ALLOWED_TYPES.has(file.type) : false;
  const extOk = ALLOWED_EXT.has(ext);
  if (!typeOk && !extOk) {
    return NextResponse.json(
      { error: `Unsupported image type (${file.type || ext || "unknown"})` },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const filename = `${randomUUID()}.${ext || "jpg"}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes));
  } catch (e) {
    console.error("[bug-reports/upload] write failed", e);
    return NextResponse.json({ error: "Storage write failed" }, { status: 500 });
  }

  return NextResponse.json({ url: `/uploads/bug-reports/${filename}` }, { status: 201 });
}
