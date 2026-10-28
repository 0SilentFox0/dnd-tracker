import type auth from "./messages/uk/auth.json";
import type common from "./messages/uk/common.json";
import type errors from "./messages/uk/errors.json";
import type landing from "./messages/uk/landing.json";
import type validation from "./messages/uk/validation.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: "uk" | "en";
    Messages: {
      common: typeof common;
      validation: typeof validation;
      errors: typeof errors;
      auth: typeof auth;
      landing: typeof landing;
    };
  }
}
