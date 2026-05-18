// Production migrator — runs inside the Docker image (immutable deploy).
//
// Uses drizzle-orm's postgres-js migrator (a production dependency) instead
// of drizzle-kit (dev-only), so the runtime image needs no dev tooling.
// Reads the SQL files + journal baked into the image at ./src/db/migrations.
//
// Invoked by the deploy pipeline as a one-shot before swapping the app
// container:  docker run --rm --network host --env-file .env.local IMG \
//             node scripts/migrate.mjs
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

try {
  console.log("[migrate] applying migrations from ./src/db/migrations …");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("[migrate] done");
  await sql.end();
  process.exit(0);
} catch (err) {
  console.error("[migrate] FAILED:", err);
  await sql.end().catch(() => {});
  process.exit(1);
}
