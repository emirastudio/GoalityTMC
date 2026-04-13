/**
 * Unit test for `generateLeaguePhase` (UCL-style league phase / simplified Swiss).
 *
 * Run with:
 *   npx tsx scripts/test-swiss.ts
 *
 * Exits with non-zero status on failure.
 */

import {
  generateLeaguePhase,
  generateFixturesByKind,
} from "@/lib/scheduling/fixtures";

let failures = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error(`  FAIL: ${msg}`);
    failures++;
  } else {
    console.log(`  ok:   ${msg}`);
  }
}

function section(name: string) {
  console.log(`\n== ${name} ==`);
}

// ────────────────────────────────────────────────────────────────────────
// Case 1: UCL shape — 36 teams × 8 matches each
// ────────────────────────────────────────────────────────────────────────
section("36 teams × 8 matches (UCL)");
{
  const teams = Array.from({ length: 36 }, (_, i) => i + 1);
  const pairings = generateLeaguePhase(teams, 8, 42);

  assert(pairings.length === 144, `pairings.length === 144 (got ${pairings.length})`);

  const countPerTeam = new Map<number, number>();
  const seenPairs = new Set<string>();
  let dupCount = 0;
  for (const p of pairings) {
    assert(p.homeTeamId != null, "homeTeamId is not null");
    assert(p.awayTeamId != null, "awayTeamId is not null");
    countPerTeam.set(p.homeTeamId!, (countPerTeam.get(p.homeTeamId!) ?? 0) + 1);
    countPerTeam.set(p.awayTeamId!, (countPerTeam.get(p.awayTeamId!) ?? 0) + 1);

    const key =
      p.homeTeamId! < p.awayTeamId!
        ? `${p.homeTeamId}-${p.awayTeamId}`
        : `${p.awayTeamId}-${p.homeTeamId}`;
    if (seenPairs.has(key)) dupCount++;
    seenPairs.add(key);
  }

  // Silent passes already verified per-pairing; now one aggregate assert:
  let allK = true;
  for (const t of teams) {
    if (countPerTeam.get(t) !== 8) {
      console.error(`    team ${t} played ${countPerTeam.get(t)} instead of 8`);
      allK = false;
    }
  }
  assert(allK, "every team plays exactly 8 matches");
  assert(dupCount === 0, `no duplicated pairs (dupCount=${dupCount})`);
  assert(seenPairs.size === 144, `144 unique pairs (got ${seenPairs.size})`);
}

// ────────────────────────────────────────────────────────────────────────
// Case 2: Determinism — same seed ⇒ same output
// ────────────────────────────────────────────────────────────────────────
section("determinism");
{
  const teams = Array.from({ length: 36 }, (_, i) => i + 1);
  const a = generateLeaguePhase(teams, 8, 1234);
  const b = generateLeaguePhase(teams, 8, 1234);
  const same =
    a.length === b.length &&
    a.every(
      (p, i) =>
        p.homeTeamId === b[i].homeTeamId &&
        p.awayTeamId === b[i].awayTeamId &&
        p.round === b[i].round,
    );
  assert(same, "same seed ⇒ identical pairings");

  // Implicit seed (no explicit seed arg) must also be deterministic for the
  // same sorted team set.
  const c = generateLeaguePhase(teams, 8);
  const d = generateLeaguePhase(teams.slice().reverse(), 8);
  const cdSame =
    c.length === d.length &&
    c.every(
      (p, i) =>
        p.homeTeamId === d[i].homeTeamId &&
        p.awayTeamId === d[i].awayTeamId &&
        p.round === d[i].round,
    );
  assert(cdSame, "implicit seed is order-independent (same set ⇒ same output)");

  // Different seed ⇒ (almost surely) different output.
  const e = generateLeaguePhase(teams, 8, 9999);
  const changed = e.some(
    (p, i) => p.homeTeamId !== a[i].homeTeamId || p.awayTeamId !== a[i].awayTeamId,
  );
  assert(changed, "different seed ⇒ different pairings");
}

// ────────────────────────────────────────────────────────────────────────
// Case 3: Small pool
// ────────────────────────────────────────────────────────────────────────
section("small pool (8 teams × 4 matches)");
{
  const teams = [10, 11, 12, 13, 14, 15, 16, 17];
  const pairings = generateLeaguePhase(teams, 4, 7);
  assert(pairings.length === 16, `pairings.length === 16 (got ${pairings.length})`);
  const count = new Map<number, number>();
  for (const p of pairings) {
    count.set(p.homeTeamId!, (count.get(p.homeTeamId!) ?? 0) + 1);
    count.set(p.awayTeamId!, (count.get(p.awayTeamId!) ?? 0) + 1);
  }
  const allFour = teams.every((t) => count.get(t) === 4);
  assert(allFour, "every team plays exactly 4 matches");
}

// ────────────────────────────────────────────────────────────────────────
// Case 4: matchesPerTeam clamped
// ────────────────────────────────────────────────────────────────────────
section("clamping");
{
  const teams = [1, 2, 3, 4];
  // Requesting 100 matches with only 4 teams → clamp to N-1=3
  const pairings = generateLeaguePhase(teams, 100, 1);
  // 4 teams × 3 matches each / 2 = 6 total pairings = full round-robin
  assert(pairings.length === 6, `clamped: 6 pairings (got ${pairings.length})`);

  // Requesting 0 → clamped to 1 → 4 teams / 2 = 2 matches, but round 1 only
  const single = generateLeaguePhase(teams, 0, 1);
  assert(single.length === 2, `k=0 clamped to k=1: 2 matches (got ${single.length})`);
}

// ────────────────────────────────────────────────────────────────────────
// Case 5: Dispatcher wiring
// ────────────────────────────────────────────────────────────────────────
section("generateFixturesByKind dispatches league correctly");
{
  const teams = Array.from({ length: 36 }, (_, i) => i + 1);
  const result = generateFixturesByKind("league", { teamIds: teams });
  assert(result.kind === "league-phase", `kind === 'league-phase'`);
  if (result.kind === "league-phase") {
    assert(
      result.pairings.length === 144,
      `default dispatch: 144 pairings (got ${result.pairings.length})`,
    );
  }

  // group kind still produces full round-robin
  const groupResult = generateFixturesByKind("group", {
    teamIds: [1, 2, 3, 4],
  });
  assert(groupResult.kind === "round-robin", `group kind ⇒ round-robin`);
  if (groupResult.kind === "round-robin") {
    // 4 teams round-robin = 6 matches
    assert(groupResult.pairings.length === 6, `4 teams RR = 6 matches`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────
console.log("");
if (failures === 0) {
  console.log("ALL TESTS PASSED");
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
