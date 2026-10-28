import type artifacts from "./messages/uk/artifacts.json";
import type auth from "./messages/uk/auth.json";
import type backgrounds from "./messages/uk/backgrounds.json";
import type choices from "./messages/uk/choices.json";
import type classes from "./messages/uk/classes.json";
import type common from "./messages/uk/common.json";
import type errors from "./messages/uk/errors.json";
import type feats from "./messages/uk/feats.json";
import type help from "./messages/uk/help.json";
import type landing from "./messages/uk/landing.json";
import type music from "./messages/uk/music.json";
import type onboarding from "./messages/uk/onboarding.json";
import type races from "./messages/uk/races.json";
import type skills from "./messages/uk/skills.json";
import type validation from "./messages/uk/validation.json";
import type whatsNew from "./messages/uk/whatsNew.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: "uk" | "en";
    Messages: {
      common: typeof common;
      validation: typeof validation;
      errors: typeof errors;
      auth: typeof auth;
      landing: typeof landing;
      onboarding: typeof onboarding;
      whatsNew: typeof whatsNew;
      help: typeof help;
      races: typeof races;
      skills: typeof skills;
      classes: typeof classes;
      feats: typeof feats;
      backgrounds: typeof backgrounds;
      artifacts: typeof artifacts;
      music: typeof music;
      choices: typeof choices;
    };
  }
}
