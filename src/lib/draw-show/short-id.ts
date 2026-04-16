/**
 * Short-id generator for /draw share-links.
 *
 * Alphabet is intentionally a readable subset — no 0/O/1/l/I confusion
 * when someone reads the URL off a phone screen. 26 letters + 8 digits
 * at 6 characters = 34^6 ≈ 1.5 billion combinations, plenty for a
 * standalone product with collision retries.
 */

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // 31 chars, readable

const LENGTH = 6;

export function generateShortId(): string {
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Accept only characters from our alphabet and the exact expected length. */
export function isShortId(candidate: string): boolean {
  if (candidate.length !== LENGTH) return false;
  for (const c of candidate) {
    if (ALPHABET.indexOf(c) === -1) return false;
  }
  return true;
}
