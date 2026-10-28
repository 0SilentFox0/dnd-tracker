import type { ZodType } from "zod";

import "server-only";
import type { ReferenceKindValue } from "@/lib/cache/tags";
import type { AccessLevel, Actor } from "@/lib/utils/api/actor";

export type ContentKind = "units" | "races" | "classes" | "spells" | "spell-groups" | "main-skills" | "skills" | "artifacts" | "artifact-sets" | "tracks";

export type FindPurpose = "read" | "write";

export interface ContentResource<Row = unknown, Create = unknown, Update = unknown> {
  kind: ContentKind;
  /** list item fields besides id and name/title, for content_list */
  listFields: readonly string[];
  /** dynamic segment name of the item route folder */
  idParam: string;
  label: string;
  description: string;
  /** path under /api/campaigns/{id} */
  path: string;
  schemas: {
    create: ZodType<Create>;
    update: ZodType<Update>;
    query?: ZodType;
    /** narrower create body for API docs (tracks: YouTube only) */
    apiCreate?: ZodType;
  };
  /** extra error statuses beyond 400/401/403/404, for API docs */
  errors?: readonly (409 | 422)[];
  access: { list: AccessLevel; item: AccessLevel };
  invalidates: readonly ReferenceKindValue[];
  notFound: string;
  list(actor: Actor, query: URLSearchParams): Promise<unknown>;
  /** scoped to actor.campaignId; null when missing or in another campaign */
  find(actor: Actor, id: string, purpose: FindPurpose): Promise<Row | null>;
  toItem?(row: Row): unknown;
  create(actor: Actor, input: Create): Promise<Row>;
  update(actor: Actor, existing: Row, input: Update): Promise<Row>;
  remove(actor: Actor, existing: Row): Promise<void>;
  /** absent → bulk delete is not offered (405) */
  removeAll?(actor: Actor): Promise<number>;
}

export const defineResource = <Row, Create, Update>(def: ContentResource<Row, Create, Update>) => def;

export type AnyContentResource = ContentResource<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
