import { describe, it, expect } from "vitest";
import {
  tournamentNavDefinitions,
  tournamentNavPresentation,
  buildTournamentHref,
  resolveTournamentNavAccess,
  groupTournamentNavItems,
  type TournamentNavDefinition,
} from "@/components/admin/tournament-nav-items";

const byId = (id: string): TournamentNavDefinition => {
  const d = tournamentNavDefinitions.find((x) => x.id === id);
  if (!d) throw new Error(`missing def: ${id}`);
  return d;
};

describe("tournament nav — single source of truth", () => {
  // Regression guard for the live-tournament incident: these four were the
  // items silently missing from the mobile drawer (Control Room unreachable).
  it("includes the items that were missing on mobile", () => {
    const ids = tournamentNavDefinitions.map((d) => d.id);
    for (const id of ["hub", "referees", "regulations", "news"]) {
      expect(ids).toContain(id);
    }
  });

  it("has a stable, complete ordered id list", () => {
    expect(tournamentNavDefinitions.map((d) => d.id)).toEqual([
      "overview", "hub", "planner", "setup", "regulations",
      "registrations", "teams",
      "payments",
      "offerings", "stadiums", "hotels", "referees",
      "messages", "news",
    ]);
  });

  it("has presentation (icon+color) for every definition", () => {
    for (const d of tournamentNavDefinitions) {
      expect(tournamentNavPresentation[d.id]).toBeTruthy();
      expect(tournamentNavPresentation[d.id].icon).toBeTruthy();
    }
  });

  // Freeze the entitlement mapping so it matches the desktop sidebar exactly
  // and can't be silently re-modelled. `referees` under hasMatchHub preserves
  // existing (possibly historical) desktop behaviour on purpose.
  it("gates exactly the items the desktop sidebar gates", () => {
    const gated = Object.fromEntries(
      tournamentNavDefinitions.filter((d) => d.entitlement).map((d) => [d.id, d.entitlement]),
    );
    expect(gated).toEqual({
      hub: "hasMatchHub",
      referees: "hasMatchHub",
      payments: "hasFinance",
      messages: "hasMessaging",
    });
  });
});

describe("buildTournamentHref", () => {
  const base = "/org/acme/admin/tournament/42";
  it("maps overview to the base itself", () => {
    expect(buildTournamentHref(byId("overview"), base)).toBe(base);
  });
  it("appends the relative path for other items", () => {
    expect(buildTournamentHref(byId("hub"), base)).toBe(`${base}/hub`);
    expect(buildTournamentHref(byId("referees"), base)).toBe(`${base}/referees`);
  });
});

describe("resolveTournamentNavAccess — open / locked / pending state machine", () => {
  it("ungated items are always open (appear instantly, no matter the modules)", () => {
    expect(resolveTournamentNavAccess(byId("planner"), null).state).toBe("open");
    expect(resolveTournamentNavAccess(byId("planner"), { hasMatchHub: false }).state).toBe("open");
  });

  it("gated items are PENDING while still loading — never flashed open, never hidden", () => {
    expect(resolveTournamentNavAccess(byId("hub"), null, "loading").state).toBe("pending");
    expect(resolveTournamentNavAccess(byId("payments"), null, "loading").state).toBe("pending");
    // default status is "loading" → pending
    expect(resolveTournamentNavAccess(byId("hub"), null).state).toBe("pending");
  });

  it("gated items go to a safe LOCKED (not pending, not open) when modules failed to load or came back empty", () => {
    // error with no last-good value → never unlock a paid feature, never animate forever
    expect(resolveTournamentNavAccess(byId("hub"), null, "error").state).toBe("locked");
    // resolved but empty (e.g. 401) → also locked, not stuck pending
    expect(resolveTournamentNavAccess(byId("hub"), null, "ready").state).toBe("locked");
  });

  it("gated items lock only when the flag is explicitly false", () => {
    expect(resolveTournamentNavAccess(byId("hub"), { hasMatchHub: false }).state).toBe("locked");
    expect(resolveTournamentNavAccess(byId("hub"), { hasMatchHub: true }).state).toBe("open");
  });

  it("does not lock on an undefined flag within a loaded modules object", () => {
    expect(resolveTournamentNavAccess(byId("hub"), {}).state).toBe("open");
  });
});

describe("groupTournamentNavItems", () => {
  it("groups every item under its section, order preserved, nothing lost", () => {
    const g = groupTournamentNavItems();
    expect(g.tournament.map((d) => d.id)).toEqual(["overview", "hub", "planner", "setup", "regulations"]);
    expect(g.participants.map((d) => d.id)).toEqual(["registrations", "teams"]);
    expect(g.finance.map((d) => d.id)).toEqual(["payments"]);
    expect(g.organization.map((d) => d.id)).toEqual(["offerings", "stadiums", "hotels", "referees"]);
    expect(g.communication.map((d) => d.id)).toEqual(["messages", "news"]);
    const total = Object.values(g).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(tournamentNavDefinitions.length);
  });
});
