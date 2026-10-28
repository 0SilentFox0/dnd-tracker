import "server-only";
import type { ContentKind } from "@/lib/server/content/define-resource";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

export const KINDS = Object.keys(CONTENT_RESOURCES) as [ContentKind, ...ContentKind[]];

export const EXTRA = ["abilities", "rules", "skill-tree"] as const;

export const SCHEMA_TARGETS = [...KINDS, ...EXTRA] as [ContentKind | (typeof EXTRA)[number], ...Array<ContentKind | (typeof EXTRA)[number]>];

export type SchemaTarget = (typeof SCHEMA_TARGETS)[number];
