/**
 * Pure, framework-free cache for per-tournament data with in-flight dedup.
 *
 * Extracted from the React hook so the concurrency/isolation behaviour is
 * unit-testable in node (no DOM, no fetch): the store takes an injected
 * `fetcher`, so tests drive it with a fake.
 *
 * Isolation contract: entries are keyed by an OPAQUE string the caller
 * composes (e.g. `${orgSlug}/${tournamentId}`). Different keys never share
 * state — this is what prevents one tournament's (or org's) entitlements from
 * leaking into another's.
 */

export type CacheStatus = "loading" | "ready" | "error";

interface Entry<T> {
  value: T | null;        // last-good value; survives a later failed refetch
  status: CacheStatus;
  promise: Promise<T | null> | null; // in-flight request (for dedup)
  listeners: Set<() => void>;
}

const store = new Map<string, Entry<unknown>>();

function entryFor<T>(key: string): Entry<T> {
  let e = store.get(key) as Entry<T> | undefined;
  if (!e) {
    e = { value: null, status: "loading", promise: null, listeners: new Set() };
    store.set(key, e as Entry<unknown>);
  }
  return e;
}

function notify(e: Entry<unknown>) {
  e.listeners.forEach((fn) => fn());
}

/** Current cached snapshot for a key (does not trigger a load). */
export function getCached<T>(key: string): { value: T | null; status: CacheStatus } {
  const e = store.get(key) as Entry<T> | undefined;
  return e ? { value: e.value, status: e.status } : { value: null, status: "loading" };
}

/** Subscribe to changes for a key; returns an unsubscribe fn. */
export function subscribe(key: string, fn: () => void): () => void {
  const e = entryFor(key);
  e.listeners.add(fn);
  return () => {
    e.listeners.delete(fn);
  };
}

/**
 * Ensure a load is (or has been) started for `key`. Concurrent callers share
 * the single in-flight promise. Keeps the last-good value on failure and
 * clears the promise so a later call can retry.
 */
export function ensureLoaded<T>(key: string, fetcher: () => Promise<T | null>): Promise<T | null> {
  const e = entryFor<T>(key);
  if (e.promise) return e.promise;          // dedup concurrent callers
  if (e.status === "ready") return Promise.resolve(e.value); // already loaded
  return startLoad(e, fetcher);
}

function startLoad<T>(e: Entry<T>, fetcher: () => Promise<T | null>): Promise<T | null> {
  e.status = e.value === null ? "loading" : e.status;
  e.promise = fetcher()
    .then((v) => {
      if (v !== null && v !== undefined) e.value = v; // keep last-good on null
      e.status = "ready";
      e.promise = null;
      notify(e as Entry<unknown>);
      return e.value;
    })
    .catch(() => {
      e.status = "error";
      e.promise = null;                     // allow retry; do NOT retain a rejected promise
      notify(e as Entry<unknown>);          // value stays last-good (possibly null)
      return e.value;
    });
  return e.promise;
}

/** Force a refetch for `key` (e.g. after a plan/module purchase). */
export function invalidate<T>(key: string, fetcher: () => Promise<T | null>): Promise<T | null> {
  const e = entryFor<T>(key);
  e.promise = null;
  return startLoad(e, fetcher);
}

/**
 * Wipe the whole store. Safe to call on logout / session reset.
 *
 * Note on multi-user safety: entries hold TOURNAMENT-level entitlements
 * (plan/features for an org+tournament), NOT user-specific permissions — every
 * admin of an org sees the same modules — so a stale entry cannot leak one
 * user's rights to another. The store is also plain in-memory client state,
 * discarded on any full page load (the `/logout` route is a server redirect =
 * full reload). This export exists so a future client-side auth/session reset
 * can clear it explicitly without relying on that.
 */
export function clearTournamentModulesCache() {
  store.clear();
}

/** Test-only alias. */
export const __resetTournamentModulesCache = clearTournamentModulesCache;
