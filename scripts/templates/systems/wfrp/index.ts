import type { PackHooks } from "../types";
import { wfrpI18nIssues, wfrpI18nRows } from "./i18n";
import { validateWfrpPack } from "./validate";

export const WFRP_MODULE_HOOKS: PackHooks = {
  validatePack: validateWfrpPack,
  i18nRows: wfrpI18nRows,
  i18nIssues: wfrpI18nIssues,
  afterImport: async (ctx) => (await import("./after-import")).writeRaceProfiles(ctx),
};
