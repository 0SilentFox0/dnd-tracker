import { beforeAll, describe, expect, it, vi } from "vitest";

import { AFTER_SIGN_IN_PATH } from "@/lib/constants/auth";
import { LOCALES } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translator";
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

const CODES = [
  "invalid_credentials", "email_not_confirmed", "user_already_exists", "email_exists", "weak_password", "same_password", "email_address_invalid",
  "signup_disabled", "over_email_send_rate_limit", "over_request_rate_limit", "otp_expired", "flow_state_not_found", "bad_code_verifier",
  "session_not_found", "reauthentication_needed", "access_denied", "provider_disabled", "no_code", "exchange_failed", "user_not_found", "unexpected",
];

describe.each(LOCALES)("authErrorMessage (%s)", (locale) => {
  let t: Translator;

  beforeAll(async () => {
    t = await (await vi.importActual<typeof import("@/lib/i18n/translator")>("@/lib/i18n/translator")).getTranslator(locale, "auth");
  });

  it.each(CODES)("has a text for %s", (code) => {
    const message = authErrorMessage(code, t);

    expect(message).not.toBe(code);
    expect(message).not.toContain("errors.");
  });

  it("maps Supabase error objects", () => {
    expect(authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }, t)).toBe(t("errors.invalid_credentials"));
  });

  it("interpolates the minimum password length", () => {
    expect(authErrorMessage("weak_password", t)).toContain("8");
  });

  it("falls back to the raw message, then to a generic text", () => {
    expect(authErrorMessage({ message: "Boom" }, t)).toBe("Boom");
    expect(authErrorMessage("some_new_code", t)).toBe("some_new_code");
    expect(authErrorMessage({}, t)).toBe(t("errors.fallback"));
    expect(authErrorMessage(null, t)).toBe(t("errors.fallback"));
  });

  it("recognises a disabled provider", () => {
    expect(authErrorMessage({ message: "Unsupported provider: provider is not enabled" }, t)).toBe(t("errors.provider_disabled"));
  });
});

describe("auth schemas", () => {
  const base = { displayName: "Ельдрін", email: " Wizard@Example.com ", password: "secret123", confirm: "secret123" };

  it("normalises the email", () => {
    expect(signUpSchema.parse(base).email).toBe("wizard@example.com");
  });

  it("rejects mismatched and short passwords", () => {
    const mismatch = signUpSchema.safeParse({ ...base, confirm: "other123" }).error?.issues[0];

    expect(mismatch?.path).toEqual(["confirm"]);
    expect(mismatch?.message).toBe("validation.passwordMismatch");
    expect(newPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
  });
});
