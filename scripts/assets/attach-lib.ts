import { createHash } from "crypto";

import { SRD_KINDS, type SrdData, type SrdKind } from "../srd/lib/types";

import { CampaignKind, CampaignVisibility } from "@/lib/constants/campaigns";
import type { IdName } from "@/types/common";

export const ATTACH_KINDS = ["units", "spells", "artifacts", "classes", "races", "skills", "main-skills"] as const;

export type AttachKind = (typeof ATTACH_KINDS)[number];

export const isAttachKind = (v: string | undefined): v is AttachKind => !!v && (ATTACH_KINDS as readonly string[]).includes(v);

export const ICON_FIELD: Record<AttachKind, "avatar" | "icon"> = { units: "avatar", spells: "icon", artifacts: "icon", classes: "icon", races: "icon", skills: "icon", "main-skills": "icon" };

export const ASSET_BUCKET: Record<AttachKind, string> = {
  units: "unit-icons",
  spells: "spell-icons",
  artifacts: "artifact-icons",
  classes: "class-icons",
  races: "race-icons",
  skills: "skill-icons",
  "main-skills": "main-skill-icons",
};

export const IMAGE_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

export function assertAttachAllowed(campaign: { kind: string; visibility: string }, allowOfficial: boolean): void {
  if (campaign.kind === CampaignKind.TEMPLATE && campaign.visibility === CampaignVisibility.OFFICIAL && !allowOfficial) {
    throw new Error("Це офіційний шаблон: додайте --allow-official, лише якщо іконки ваші (токени Forgotten Adventures — ніколи)");
  }
}

export const assetKey = (s: string) =>
  s
    .normalize("NFKC")
    .toLocaleLowerCase("uk")
    .replace(/[_\-:/'’\s]+/g, " ")
    .trim();

const VARIANT = /\s+(?:[a-z]\d+|v\d+|\d+)$/;

export function fileKeys(fileName: string): string[] {
  const keys = [assetKey(fileName.replace(/\.[^.]+$/, ""))];

  while (VARIANT.test(keys[keys.length - 1])) keys.push(keys[keys.length - 1].replace(VARIANT, ""));

  return keys.filter(Boolean);
}

export function srdSlugNames(kind: AttachKind, data: SrdData): Map<string, string> {
  if (!(SRD_KINDS as readonly string[]).includes(kind)) return new Map();

  return new Map((data[kind as SrdKind] as ReadonlyArray<{ slug: string; name: string }>).map((r) => [r.slug, r.name]));
}

export interface AssetMatch {
  file: string;
  id: string;
  name: string;
}

export function matchAssets(files: readonly string[], names: readonly IdName[], slugNames: ReadonlyMap<string, string> = new Map()): { matches: AssetMatch[]; unmatched: string[]; duplicates: string[] } {
  const byKey = new Map<string, IdName>();

  for (const n of names) if (!byKey.has(assetKey(n.name))) byKey.set(assetKey(n.name), n);

  for (const [slug, name] of slugNames) {
    const target = byKey.get(assetKey(name));

    if (!target) continue;

    for (const key of [assetKey(slug), assetKey(slug.replace(/^srd-\d{4}_/, ""))]) if (!byKey.has(key)) byKey.set(key, target);
  }

  const taken = new Set<string>();

  const matches: AssetMatch[] = [];

  const unmatched: string[] = [];

  const duplicates: string[] = [];

  for (const file of [...files].sort((a, b) => a.localeCompare(b))) {
    const hit = fileKeys(file)
      .map((k) => byKey.get(k))
      .find((n): n is IdName => !!n);

    if (!hit) unmatched.push(file);
    else if (taken.has(hit.id)) duplicates.push(file);
    else {
      taken.add(hit.id);
      matches.push({ file, id: hit.id, name: hit.name });
    }
  }

  return { matches, unmatched, duplicates };
}

export function objectPath(campaignId: string, kind: AttachKind, name: string, content: Buffer, ext: string): string {
  const safe =
    assetKey(name)
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "asset";

  const hash = createHash("sha1").update(content).digest("hex").slice(0, 8);

  return `${campaignId}/${kind}/${safe}-${hash}${ext}`;
}
