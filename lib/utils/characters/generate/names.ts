import { GENERIC_EN, NAME_TABLES_EN } from "./names.en";
import { GENERIC_UK, NAME_TABLES_UK } from "./names.uk";
import { pick } from "./rng";

import type { Locale } from "@/lib/i18n/config";

const TABLES = { uk: { tables: NAME_TABLES_UK, generic: GENERIC_UK }, en: { tables: NAME_TABLES_EN, generic: GENERIC_EN } };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function generateName(raceName: string, rng: () => number, locale: Locale = "uk"): string {
  const { tables, generic } = TABLES[locale];

  const matched = NAME_TABLES_UK.find((t, i) => t.match.test(raceName) || NAME_TABLES_EN[i].match.test(raceName));

  const table = (matched && tables.find((t) => t.id === matched.id)) ?? generic;

  return capitalize(pick(rng, table.first) + pick(rng, table.second));
}
