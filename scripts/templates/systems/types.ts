import type { IconsFile, Pack, PackRow } from '../lib/pack';

import type {
    KeyedString,
    TranslationsV2,
} from '@/lib/utils/templates/i18n/keys';
import type { PackKind } from '@/lib/utils/templates/manifest';

export interface PackIssue {
    level: 'error' | 'warning';
    kind?: string;
    slug?: string;
    message: string;
}

/** Row ids and slugs by kind; `idOf` is empty on export, `slugOf` on import. */
export interface PackRefs {
    idOf(kind: PackKind, slug: string): string | undefined;
    slugOf(kind: PackKind, id: string): string | undefined;
}

export type Glossary = Record<string, string>;

/** What `prepareRows` may read; `idByName` maps row names of a kind already in the template to ids. */
export interface PrepareCtx {
    pack: Pack;
    icons: IconsFile;
    idByName(kind: PackKind): Promise<ReadonlyMap<string, string>>;
}

export interface PackHooks {
    validatePack?(pack: Pack): PackIssue[];
    /** System-specific catalog rows for translation (pseudo-kinds allowed); defaults to the pack rows. */
    i18nRows?(pack: Pack): Record<string, { slug: string; name?: unknown }[]>;
    i18nIssues?(pack: Pack, tr: TranslationsV2): string[];
    afterImport?(ctx: {
        pack: Pack;
        templateId: string;
        idBySlug: Record<string, Record<string, string>>;
    }): Promise<void>;
    /** Export: ids inside rows of kinds the importer does not know become slugs. */
    toPackRow?(
        kind: PackKind,
        row: Record<string, unknown>,
        refs: PackRefs
    ): PackRow;
    /** Import: the inverse of `toPackRow`, applied before the row is written; may set `id` for a fresh row. */
    fromPackRow?(
        kind: PackKind,
        row: PackRow,
        refs: PackRefs & { rowId: string | undefined }
    ): PackRow;
    /** Import: system-specific row rewrites after the generic icon fill, before the importer sees the rows. */
    prepareRows?(
        kind: PackKind,
        rows: PackRow[],
        ctx: PrepareCtx
    ): Promise<PackRow[]>;
    /** Translation apply: mechanical fix-ups of a translated entry before validation. */
    normalizeTranslation?(
        entry: KeyedString,
        text: string,
        glossary: Glossary
    ): string;
}
