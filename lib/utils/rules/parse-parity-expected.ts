import type { Ruleset } from "./schema";

type Section = keyof Ruleset;

export type ExpectedDifference = {
  id: string;
  section: Section;
  reason: string;
  applies: (raw: Record<string, unknown>, next: Ruleset) => boolean;
};

const rawSection = (raw: Record<string, unknown>, section: Section): Record<string, unknown> | null => {
  const value = raw[section];

  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

export const EXPECTED_DIFFERENCES: ExpectedDifference[] = [
  {
    id: "unknown extra key in section",
    section: "saves",
    reason: "an unknown sub-key no longer drops the whole section to defaults",
    applies: (raw, next) => {
      const stored = rawSection(raw, "saves");

      return !!stored && Object.keys(stored).some((key) => !(key in next.saves));
    },
  },
  {
    id: "invalid custom condition item",
    section: "conditions",
    reason: "an invalid conditions.custom falls back to its own default, enabled/exhaustion are kept",
    applies: (raw, next) => {
      const stored = rawSection(raw, "conditions");

      return !!stored && Array.isArray(stored.custom) && JSON.stringify(stored.custom) !== JSON.stringify(next.conditions.custom);
    },
  },
];

export const expectedDifferenceFor = (section: string, raw: unknown, next: Ruleset): ExpectedDifference | undefined => {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return EXPECTED_DIFFERENCES.find((entry) => entry.section === section && entry.applies(source, next));
};
