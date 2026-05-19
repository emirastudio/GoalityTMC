// Canonical password policy — the SINGLE source of truth.
//
// Used by the client strength meter (password-strength-input.tsx) AND
// enforced server-side at every account-creation endpoint, so the API
// can never be weaker than the UI implies.
//
// Rule: at least 8 characters, with an uppercase letter, a lowercase
// letter and a digit.

export const PASSWORD_TESTS: ReadonlyArray<(v: string) => boolean> = [
  (v) => v.length >= 8,
  (v) => /[A-Z]/.test(v),
  (v) => /[a-z]/.test(v),
  (v) => /\d/.test(v),
];

export function isPasswordValid(value: string): boolean {
  return PASSWORD_TESTS.every((t) => t(value));
}

export type PasswordStrength = "empty" | "weak" | "medium" | "strong";

export function getPasswordStrength(value: string): PasswordStrength {
  if (!value) return "empty";
  const passed = PASSWORD_TESTS.filter((t) => t(value)).length;
  if (passed <= 1) return "weak";
  if (passed <= 3) return "medium";
  return "strong";
}

// Plain English message for API error responses (the client UIs surface
// their own localized hints; this is the server fallback / defence).
export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit.";
