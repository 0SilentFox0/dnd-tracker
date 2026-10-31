import type { ClassFeatureGroup, SrdData } from "../../srd/lib/types";
import type { IconKind } from "./icons-file";

import { parseTable } from "@/lib/utils/content/import/table";

export type IdentityKind = Extract<IconKind, "features" | "races" | "classes" | "subclasses" | "backgrounds">;

export interface IdentityTarget { kind: IdentityKind; key: string; recordId: string }

export const SRD_PREFIX = "srd-2024_";

export const SUBCLASS_RECORD_ALIAS: Record<string, string> = {
  "srd-2024_sorcerer/draconic-sorcery": "subclass:sorcerer-draconic-bloodline",
  "srd-2024_warlock/fiend-patron": "subclass:warlock-the-fiend",
  "srd-2024_wizard/evoker": "subclass:wizard-school-of-evocation",
};

export const IDENTITY_SIZE = 256;

export const IDENTITY_BUCKET: Record<IdentityKind, string> = {
  races: "race-icons",
  classes: "class-icons",
  subclasses: "class-icons",
  backgrounds: "background-icons",
  features: "feature-icons",
};

const PLACEHOLDER_RE = /-subclass(?:es)?-\d+$/;

const bare = (slug: string) => slug.slice(SRD_PREFIX.length);

export function expectedTargets(data: SrdData): IdentityTarget[] {
  const targets: IdentityTarget[] = [];

  for (const r of data.races) targets.push({ kind: "races", key: r.slug, recordId: `race:${bare(r.slug)}` });

  for (const c of data.classes) targets.push({ kind: "classes", key: c.slug, recordId: `class:${bare(c.slug)}` });

  for (const c of data.classes) {
    for (const s of c.subclasses) {
      const key = `${c.slug}/${s.id}`;

      targets.push({ kind: "subclasses", key, recordId: SUBCLASS_RECORD_ALIAS[key] ?? `subclass:${bare(c.slug)}-${s.id}` });
    }
  }

  for (const b of data.backgrounds) targets.push({ kind: "backgrounds", key: b.slug, recordId: `background:${bare(b.slug)}` });

  const features = (groups: ClassFeatureGroup[], scope: string) =>
    groups.flatMap((g) => g.abilities.filter((a) => !PLACEHOLDER_RE.test(a.id)).map((a) => ({ kind: "features" as const, key: `${scope}/${a.id}`, recordId: `feature:${scope.replace(SRD_PREFIX, "")}/${a.id}` })));

  for (const c of data.classes) {
    targets.push(...features(c.features, c.slug));

    for (const s of c.subclasses) targets.push(...features(s.features, `${c.slug}/${s.id}`));
  }

  return targets;
}

export function parseIdentityCsv(csv: string): Map<string, { folder: string; file: string }> {
  const out = new Map<string, { folder: string; file: string }>();

  for (const r of parseTable(csv, "identity.csv").rows) {
    const id = String(r.record_id ?? "");

    if (id) out.set(id, { folder: String(r.generation_folder), file: String(r.output_filename) });
  }

  return out;
}
