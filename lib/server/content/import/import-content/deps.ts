import 'server-only';
import { type ReferenceKindValue } from '@/lib/cache/tags';
import type { AnyContentResource } from '@/lib/server/content/define-resource';
import {
    type KeyRow,
    loadKeys,
    writeSlug,
} from '@/lib/server/content/import/slug';
import { assertKindActive } from '@/lib/server/content/kind-active';
import { CONTENT_RESOURCES } from '@/lib/server/content/resources';
import type { Actor } from '@/lib/utils/api/actor';
import type { ImportKind } from '@/types/content-import';

export interface ImportDeps {
    resource(kind: ImportKind): AnyContentResource;
    loadKeys(campaignId: string, kind: ImportKind): Promise<KeyRow[]>;
    writeSlug(
        campaignId: string,
        kind: ImportKind,
        id: string,
        slug: string
    ): Promise<void>;
    invalidate?(kinds: readonly ReferenceKindValue[], campaignId: string): void;
    assertKind?(actor: Actor, kind: ImportKind): Promise<void>;
    transactional?: boolean;
    skipUnchanged?: boolean;
}

export const DEFAULT_IMPORT_DEPS: ImportDeps = {
    resource: (kind) => CONTENT_RESOURCES[kind] as AnyContentResource,
    loadKeys,
    writeSlug,
    assertKind: (actor, kind) => assertKindActive(kind, actor),
    transactional: true,
};

/** Pack import: the template campaign may not exist yet (dry run) and a pack's kinds are in its own rules (D14) */
export const OFFLINE_IMPORT_DEPS: ImportDeps = {
    ...DEFAULT_IMPORT_DEPS,
    assertKind: undefined,
    invalidate: () => undefined,
    skipUnchanged: true,
};
