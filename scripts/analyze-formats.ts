/**
 * Read-only analysis of every tournament in the DB through the scheduling v2
 * engine. For each tournament × division it:
 *   1. Loads a DbSnapshot
 *   2. Calls buildProblem to materialise the solver input
 *   3. Calls solve() and reports placed/unplaced/elapsed/scores
 *
 * NEVER writes to the DB. Safe to run against any snapshot.
 *
 * Usage:
 *   DATABASE_URL="postgres://goality:GoalityDev2026@localhost:5432/goality_analysis" \
 *     npx tsx scripts/analyze-formats.ts
 */

import postgres from "postgres";

process.env.DATABASE_URL ||=
  "postgres://goality:GoalityDev2026@localhost:5432/goality_analysis";

// Dynamic imports so DATABASE_URL is set before src/db/index runs.
async function main() {
  const { loadSchedulingSnapshot } = await import("@/lib/scheduling-db");
  const { buildProblem, solve } = await import("@/lib/scheduling");
  const { generateLeaguePhase } = await import("@/lib/scheduling/fixtures");

  const sql = postgres(process.env.DATABASE_URL!);

  console.log("=".repeat(78));
  console.log("GoalityTMC — scheduling v2 analysis");
  console.log("DB:", process.env.DATABASE_URL!.replace(/:[^:@]+@/, ":***@"));
  console.log("=".repeat(78));

  const tournaments = await sql<
    Array<{ id: number; name: string; organization_id: number; start_date: Date | null; end_date: Date | null }>
  >`SELECT id, name, organization_id, start_date, end_date FROM tournaments ORDER BY id`;

  console.log(`\nFound ${tournaments.length} tournaments:`);
  for (const t of tournaments) console.log(`  #${t.id}  ${t.name}`);

  type StageStat = {
    tournamentId: number;
    classId: number;
    stageType: string;
    expected: number;
    placed: number;
    unplaced: number;
    hardViolations: number;
    softScore: number;
    elapsedMs: number;
  };
  const stageStats: StageStat[] = [];
  const tournamentStats: Array<{
    id: number;
    name: string;
    divisionCount: number;
    stageCount: number;
    matchCount: number;
    placed: number;
    unplaced: number;
    elapsedMs: number;
  }> = [];

  for (const t of tournaments) {
    console.log(`\n${"─".repeat(78)}`);
    console.log(`TOURNAMENT #${t.id}  ${t.name}`);
    console.log(`  org=${t.organization_id}  start=${t.start_date?.toISOString()?.slice(0, 10) ?? "—"}  end=${t.end_date?.toISOString()?.slice(0, 10) ?? "—"}`);

    const classes = await sql<Array<{ id: number; name: string }>>`
      SELECT id, name FROM tournament_classes
      WHERE tournament_id = ${t.id}
      ORDER BY id
    `;
    const stageRows = await sql<
      Array<{ id: number; class_id: number; type: string; order: number; name: string }>
    >`
      SELECT id, class_id, type, "order", name FROM tournament_stages
      WHERE tournament_id = ${t.id}
      ORDER BY class_id, "order"
    `;
    const matchRows = await sql<Array<{ class_id: number; stage_id: number }>>`
      SELECT ts.class_id, m.stage_id FROM matches m
      JOIN tournament_stages ts ON ts.id = m.stage_id
      WHERE m.tournament_id = ${t.id} AND m.deleted_at IS NULL
    `;

    console.log(`  divisions: ${classes.length}, stages: ${stageRows.length}, matches: ${matchRows.length}`);
    for (const c of classes) {
      const stagesInClass = stageRows.filter((s) => s.class_id === c.id);
      const matchesInClass = matchRows.filter((m) => m.class_id === c.id).length;
      console.log(`    division ${c.id} (${c.name}): ${stagesInClass.length} stages, ${matchesInClass} matches`);
      for (const s of stagesInClass) {
        const mInS = matchRows.filter((m) => m.stage_id === s.id).length;
        console.log(`      stage ${s.id} [${s.type}] order=${s.order} name="${s.name}" matches=${mInS}`);
      }
    }

    let tournamentTotalMatches = 0;
    let tournamentPlaced = 0;
    let tournamentUnplaced = 0;
    let tournamentElapsed = 0;

    for (const c of classes) {
      try {
        const snap = await loadSchedulingSnapshot({ tournamentId: t.id, classId: c.id });
        const problem = buildProblem(snap);
        const expected = problem.matchTemplates.length;
        if (expected === 0) {
          console.log(`    [div ${c.id}] no matches — skipping solve`);
          continue;
        }
        const t0 = Date.now();
        const solution = solve(problem);
        const elapsed = Date.now() - t0;
        const placed = solution.assignments.length;
        const unplaced = solution.unplaced.length;
        const hardV = solution.score.hardViolations;
        const softS = solution.score.softScore;

        console.log(
          `    [div ${c.id}] expected=${expected}  placed=${placed}  unplaced=${unplaced}  hard=${hardV}  soft=${softS.toFixed(2)}  elapsed=${elapsed}ms`,
        );

        tournamentTotalMatches += expected;
        tournamentPlaced += placed;
        tournamentUnplaced += unplaced;
        tournamentElapsed += elapsed;

        for (const st of stageRows.filter((s) => s.class_id === c.id)) {
          const stageMatches = problem.matchTemplates.filter((m) => m.stageId === st.id);
          const stagePlaced = solution.assignments.filter((a) => stageMatches.some((m) => m.id === a.matchId)).length;
          stageStats.push({
            tournamentId: t.id,
            classId: c.id,
            stageType: st.type,
            expected: stageMatches.length,
            placed: stagePlaced,
            unplaced: stageMatches.length - stagePlaced,
            hardViolations: hardV,
            softScore: softS,
            elapsedMs: elapsed,
          });
        }

        // Special detail for tournament 17
        if (t.id === 17) {
          console.log(`    [t17 detail div=${c.id}] slots=${problem.slots.length} teams=${problem.teams.length} locks=${problem.locks.length}`);
          if (unplaced > 0) {
            console.log(`      first 5 unplaced reasons:`);
            for (const u of solution.unplaced.slice(0, 5)) {
              const reasons = u.reasons.map((r) => r.type).join(", ");
              console.log(`        match #${u.matchId}: ${reasons}`);
            }
          }
        }
      } catch (e) {
        console.log(`    [div ${c.id}] ERROR: ${(e as Error).message}`);
      }
    }

    tournamentStats.push({
      id: t.id,
      name: t.name,
      divisionCount: classes.length,
      stageCount: stageRows.length,
      matchCount: tournamentTotalMatches,
      placed: tournamentPlaced,
      unplaced: tournamentUnplaced,
      elapsedMs: tournamentElapsed,
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(78)}\nSUMMARY — tournament totals\n${"=".repeat(78)}`);
  console.table(tournamentStats);

  console.log(`\n${"=".repeat(78)}\nSUMMARY — per stage type\n${"=".repeat(78)}`);
  const byType = new Map<
    string,
    { stages: number; expected: number; placed: number; unplaced: number; elapsed: number }
  >();
  for (const s of stageStats) {
    const rec = byType.get(s.stageType) ?? { stages: 0, expected: 0, placed: 0, unplaced: 0, elapsed: 0 };
    rec.stages++;
    rec.expected += s.expected;
    rec.placed += s.placed;
    rec.unplaced += s.unplaced;
    rec.elapsed += s.elapsedMs;
    byType.set(s.stageType, rec);
  }
  for (const [type, rec] of byType) {
    const ratio = rec.expected > 0 ? ((rec.placed / rec.expected) * 100).toFixed(1) : "—";
    console.log(
      `  ${type.padEnd(10)} stages=${rec.stages}  expected=${rec.expected}  placed=${rec.placed}  unplaced=${rec.unplaced}  placed_ratio=${ratio}%`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Synthetic league phase test (UCL-like)
  // ──────────────────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(78)}\nSYNTHETIC TEST — 36 teams × 8 matches (UCL shape)\n${"=".repeat(78)}`);
  const teamIds = Array.from({ length: 36 }, (_, i) => i + 1);
  const pairings = generateLeaguePhase(teamIds, 8);
  const perTeam = new Map<number, number>();
  const pairKey = new Set<string>();
  for (const p of pairings) {
    perTeam.set(p.homeTeamId!, (perTeam.get(p.homeTeamId!) ?? 0) + 1);
    perTeam.set(p.awayTeamId!, (perTeam.get(p.awayTeamId!) ?? 0) + 1);
    const k = p.homeTeamId! < p.awayTeamId! ? `${p.homeTeamId}-${p.awayTeamId}` : `${p.awayTeamId}-${p.homeTeamId}`;
    pairKey.add(k);
  }
  const allEight = teamIds.every((t) => perTeam.get(t) === 8);
  console.log(`  total pairings:       ${pairings.length} (expected 144)`);
  console.log(`  unique pairs:         ${pairKey.size}`);
  console.log(`  every team = 8 games: ${allEight}`);
  const rounds = new Set(pairings.map((p) => p.round));
  console.log(`  distinct round count: ${rounds.size}`);

  await sql.end();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
