import { revalidateTag } from "next/cache";

export const ReferenceKind = {
  SPELLS: "spells",
  MAIN_SKILLS: "mainSkills",
  SKILLS: "skills",
  UNITS: "units",
  RACES: "races",
} as const;

export type ReferenceKindValue = (typeof ReferenceKind)[keyof typeof ReferenceKind];

const TAG_PREFIX: Record<ReferenceKindValue, string> = {
  spells: "spells",
  mainSkills: "main-skills",
  skills: "skills",
  units: "units",
  races: "races",
};

const tagFor = (kind: ReferenceKindValue) => (campaignId: string) => `${TAG_PREFIX[kind]}-${campaignId}`;

export const cacheTags: Record<ReferenceKindValue, (campaignId: string) => string> = {
  spells: tagFor(ReferenceKind.SPELLS),
  mainSkills: tagFor(ReferenceKind.MAIN_SKILLS),
  skills: tagFor(ReferenceKind.SKILLS),
  units: tagFor(ReferenceKind.UNITS),
  races: tagFor(ReferenceKind.RACES),
};

export function invalidateReference(
  kinds: ReferenceKindValue | readonly ReferenceKindValue[],
  campaignId: string,
): void {
  for (const kind of typeof kinds === "string" ? [kinds] : kinds) {
    revalidateTag(cacheTags[kind](campaignId), { expire: 0 });
  }
}
