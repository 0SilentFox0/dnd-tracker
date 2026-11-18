import type { ZodType } from 'zod';

import type { Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translator';
import type {
    AssistantActionDef,
    FieldChange,
} from '@/lib/server/assistant/types';
import type { ContentOperation } from '@/lib/server/content/operations';
import type { SyncDb } from '@/lib/server/templates/sync/context';
import type { Actor } from '@/lib/utils/api/actor';

type Row = Record<string, unknown>;

export type ContentOperationRow = Omit<ContentOperation, 'id'>;

export interface ContentOperationRunCtx {
    actor: Actor;
    input: Row;
    body: unknown;
    locale?: Locale | null;
    /** A path parameter as a string; its schema is `pathParams[key]` */
    param(key: string): string;
}

/** Read-only view of the targeted rows an assistant preview projects over */
export interface ContentPreviewCtx {
    input: Row;
    body: Row;
    t: Translator;
    rows(table: string): Row[];
    owned(table: string, inputKey: string): Row;
    field(table: string, row: Row, path: string, after: unknown): void;
    changes: FieldChange[];
}

/** A content operation a module adds next to the core ones (HTTP, OpenAPI and assistant share it) */
export interface ContentOperationContribution {
    row: ContentOperationRow;
    pathParams?: Record<string, ZodType>;
    /** Content kind that must be active in the campaign composition, else 404 */
    kind?: string;
    run(ctx: ContentOperationRunCtx): Promise<unknown>;
    /** Served by the module content dispatcher; `direct` skips the kind gate and write lock, `project` shapes the response */
    http?: { direct?: true; project?(result: unknown): unknown };
    assistant?: {
        confirm?: 'always';
        /** `assistant` i18n key of the effect "character progress is replaced" */
        erasesProgress?: string;
        /** Targeted rows (`tables`) the preview projects over; `find` reads one delegate scoped to the campaign */
        state?(
            actor: Actor,
            input: Row,
            find: (delegate: string, where: Row, select?: Row) => Promise<Row[]>
        ): Promise<{ tables: Record<string, Row[]> }>;
        preview?(ctx: ContentPreviewCtx): void;
    };
}

/** An ability owner kind (`OwnerKind` value) of a module: listed by `abilities.sources`, read by `abilities.get` */
export interface AbilityOwnerContribution {
    /** Content kind that must be active for the owners to be listed */
    contentKind: string;
    /** Position in the `abilities.sources` listing */
    order: number;
    load(where: {
        campaignId: string;
    }): Promise<Array<{ id: string; name: string }>>;
    find(where: {
        id: string;
        campaignId: string;
    }): Promise<{ id: string; abilities?: unknown } | null>;
}

export interface ContentAlias {
    actionId: string;
    payload(input: Row): unknown;
}

/** Template bundle and source-sync behavior of a module's tables, keyed by table key */
export interface SystemTemplateServer {
    /** Localizes one row; `maps[table]` maps source names to translated names for the tables that were translated */
    localize?: Record<
        string,
        (row: Row, maps: Record<string, Map<string, string>>) => Row
    >;
    /** Runs after a source update rewrote a row in place */
    afterSyncUpdate?: Record<
        string,
        (
            db: SyncDb,
            input: {
                campaignId: string;
                before: Row | undefined;
                after: Row;
            }
        ) => Promise<void>
    >;
    /** Character columns the "where is this used" scan also reads */
    usageSelect?: Record<string, unknown>;
    /** Per-character values the usage scan reads from module tables (keyed by character id) */
    usageRows?: Record<
        string,
        (db: SyncDb, characterIds: string[]) => Promise<Map<string, unknown>>
    >;
}

/** Rows of a module that a core content row of kind `host` carries under `as`, found through its `column` */
export interface RowEmbed {
    host: string;
    as: string;
    column: string;
    /** `brief` = list shape (id and name only) */
    load(input: {
        campaignId: string;
        ids: string[];
        brief?: true;
    }): Promise<Array<Record<string, unknown> & { id: string }>>;
}

export interface SystemContentServer {
    embeds?: Record<string, RowEmbed>;
    operations?: Record<string, ContentOperationContribution>;
    abilityOwners?: Record<string, AbilityOwnerContribution>;
    /** `content_schema` targets beyond the content kinds: target → component id and its schema */
    schemaTargets?: Record<string, { id: string; schema: ZodType }>;
    /** Kinds whose media (icons) is edited in the browser, not by the assistant */
    mediaKinds?: Record<string, 'icon'>;
    /** Assistant read actions keyed by action id */
    readActions?: Record<string, AssistantActionDef>;
    /** Assistant/MCP tool alias → action */
    aliases?: Record<string, ContentAlias>;
    template?: SystemTemplateServer;
}
