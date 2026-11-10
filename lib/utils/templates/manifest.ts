import type { ICON_BUCKETS } from "@/lib/constants/storage";
import type { ContentKind } from "@/lib/server/content/define-resource";

export const TEMPLATE_CONTENT_LOCALES = ["en", "uk"] as const;
export type TemplateContentLocale = (typeof TEMPLATE_CONTENT_LOCALES)[number];

export const CONTENT_KINDS = ["units", "races", "classes", "feats", "backgrounds", "careers", "spells", "spell-groups", "main-skills", "skills", "artifacts", "artifact-sets", "tracks"] as const satisfies readonly ContentKind[];

type MissingKind = Exclude<ContentKind, (typeof CONTENT_KINDS)[number]>;

const kindsExhaustive: [MissingKind] extends [never] ? true : never = true;

void kindsExhaustive;

export const PACK_KINDS = [...CONTENT_KINDS, "skillTrees"] as const;
export type PackKind = (typeof PACK_KINDS)[number];

export type IconBucket = (typeof ICON_BUCKETS)[number];

export const TEMPLATE_KEY_PATTERN = /^[a-z0-9][a-z0-9.-]*$/;

export interface TemplateManifest {
  key: string;
  system: string;
  names: Record<TemplateContentLocale, string>;
  locales: readonly TemplateContentLocale[];
  rules: { file: "rules.json" };
  kinds: readonly PackKind[];
  extras?: readonly string[];
  icons: { bucketByKind?: Partial<Record<PackKind, IconBucket>> };
  compendium?: boolean;
  source?: { repo: string; path: string; sha: string; license: string };
  credits?: string;
  include?: readonly { from: string; kinds: Partial<Record<PackKind, readonly string[] | "all">> }[];
  counts: Partial<Record<PackKind, number>>;
}
