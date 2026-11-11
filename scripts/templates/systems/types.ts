import type { Pack } from "../lib/pack";

import type { TranslationsV2 } from "@/lib/utils/templates/i18n/keys";

export interface PackIssue {
  level: "error" | "warning";
  kind?: string;
  slug?: string;
  message: string;
}

export interface PackHooks {
  validatePack?(pack: Pack): PackIssue[];
  /** System-specific catalog rows for translation (pseudo-kinds allowed); defaults to the pack rows. */
  i18nRows?(pack: Pack): Record<string, { slug: string; name?: unknown }[]>;
  i18nIssues?(pack: Pack, tr: TranslationsV2): string[];
  afterImport?(ctx: { pack: Pack; templateId: string; idBySlug: Record<string, Record<string, string>> }): Promise<void>;
}
