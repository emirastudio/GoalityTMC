import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCached,
  subscribe,
  ensureLoaded,
  invalidate,
  __resetTournamentModulesCache,
} from "@/lib/tournament-modules-cache";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => __resetTournamentModulesCache());

describe("tournament modules cache — concurrency & isolation", () => {
  it("two consumers of the SAME key share ONE in-flight request (dedup)", async () => {
    const d = deferred<{ v: string }>();
    let calls = 0;
    const fetcher = () => { calls++; return d.promise; };

    const p1 = ensureLoaded("acme/1", fetcher);
    const p2 = ensureLoaded("acme/1", fetcher); // second consumer, same key
    d.resolve({ v: "A" });
    await Promise.all([p1, p2]);

    expect(calls).toBe(1);
    expect(getCached("acme/1").value).toEqual({ v: "A" });
    expect(getCached("acme/1").status).toBe("ready");
  });

  it("does not refetch once ready", async () => {
    let calls = 0;
    await ensureLoaded("acme/1", () => { calls++; return Promise.resolve({ v: "A" }); });
    await ensureLoaded("acme/1", () => { calls++; return Promise.resolve({ v: "A" }); });
    expect(calls).toBe(1);
  });

  it("DIFFERENT tournaments (and orgs) are isolated — separate requests, separate state", async () => {
    let a = 0, b = 0, other = 0;
    await ensureLoaded("acme/1", () => { a++; return Promise.resolve({ v: "acme-1" }); });
    await ensureLoaded("acme/2", () => { b++; return Promise.resolve({ v: "acme-2" }); });
    await ensureLoaded("other/1", () => { other++; return Promise.resolve({ v: "other-1" }); });

    expect([a, b, other]).toEqual([1, 1, 1]);
    expect(getCached("acme/1").value).toEqual({ v: "acme-1" });
    expect(getCached("acme/2").value).toEqual({ v: "acme-2" });
    // same tournamentId, different org → must NOT collide
    expect(getCached("other/1").value).toEqual({ v: "other-1" });
  });

  it("a failed first request leaves error state, keeps promise clear, and allows a safe retry", async () => {
    let calls = 0;
    await ensureLoaded("acme/1", () => { calls++; return Promise.reject(new Error("boom")); });
    expect(getCached("acme/1").status).toBe("error");
    expect(getCached("acme/1").value).toBeNull(); // never auto-unlocked with bogus data

    // retry succeeds
    await ensureLoaded("acme/1", () => { calls++; return Promise.resolve({ v: "recovered" }); });
    expect(calls).toBe(2);
    expect(getCached("acme/1").status).toBe("ready");
    expect(getCached("acme/1").value).toEqual({ v: "recovered" });
  });

  it("keeps the last-good value when a later refetch fails", async () => {
    await ensureLoaded("acme/1", () => Promise.resolve({ v: "good" }));
    await invalidate("acme/1", () => Promise.reject(new Error("network")));
    expect(getCached("acme/1").status).toBe("error");
    expect(getCached("acme/1").value).toEqual({ v: "good" }); // not wiped
  });

  it("notifies every subscriber on load and on invalidate (both navs refresh together)", async () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    subscribe("acme/1", l1);
    subscribe("acme/1", l2);

    await ensureLoaded("acme/1", () => Promise.resolve({ v: 1 }));
    expect(l1).toHaveBeenCalled();
    expect(l2).toHaveBeenCalled();

    l1.mockClear(); l2.mockClear();
    await invalidate("acme/1", () => Promise.resolve({ v: 2 }));
    expect(l1).toHaveBeenCalled();
    expect(l2).toHaveBeenCalled();
    expect(getCached("acme/1").value).toEqual({ v: 2 });
  });

  it("does not notify an unsubscribed consumer (no setState-after-unmount)", async () => {
    const l = vi.fn();
    const unsub = subscribe("acme/1", l);
    unsub();
    await ensureLoaded("acme/1", () => Promise.resolve({ v: 1 }));
    expect(l).not.toHaveBeenCalled();
  });
});
