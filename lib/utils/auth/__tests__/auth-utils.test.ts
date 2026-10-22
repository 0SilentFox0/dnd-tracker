import { describe, expect, it } from "vitest";

import { AFTER_SIGN_IN_PATH, AUTH_ERRORS, AUTH_FALLBACK_ERROR } from "@/lib/constants/auth";
import { newPasswordSchema, signUpSchema } from "@/lib/schemas/auth";
import { authErrorMessage, safeNextPath } from "@/lib/utils/auth";

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
    expect(safeNextPath("/campaigns/abc?tab=x")).toBe("/campaigns/abc?tab=x");
  });

  it.each([null, undefined, "", "https://evil.test", "//evil.test", "/\\evil.test", "campaigns"])("falls back for %s", (next) => {
    expect(safeNextPath(next)).toBe(AFTER_SIGN_IN_PATH);
  });
});

describe("authErrorMessage", () => {
  it("maps Supabase codes and callback codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(AUTH_ERRORS.invalid_credentials);
    expect(authErrorMessage("otp_expired")).toBe(AUTH_ERRORS.otp_expired);
  });

  it("falls back to the raw message, then to a generic text", () => {
    expect(authErrorMessage({ message: "Boom" })).toBe("Boom");
    expect(authErrorMessage({})).toBe(AUTH_FALLBACK_ERROR);
    expect(authErrorMessage(null)).toBe(AUTH_FALLBACK_ERROR);
  });

  it("recognises a disabled provider", () => {
    expect(authErrorMessage({ message: "Unsupported provider: provider is not enabled" })).toBe(AUTH_ERRORS.provider_disabled);
  });
});

describe("auth schemas", () => {
  const base = { displayName: "Ельдрін", email: " Wizard@Example.com ", password: "secret123", confirm: "secret123" };

  it("normalises the email", () => {
    expect(signUpSchema.parse(base).email).toBe("wizard@example.com");
  });

  it("rejects mismatched and short passwords", () => {
    expect(signUpSchema.safeParse({ ...base, confirm: "other123" }).error?.issues[0].path).toEqual(["confirm"]);
    expect(newPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
  });
});
