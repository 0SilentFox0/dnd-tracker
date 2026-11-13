import { CONTENT_KINDS } from '@/lib/constants/content-kinds';
import type { ICON_BUCKETS } from '@/lib/constants/storage';

export const TEMPLATE_CONTENT_LOCALES = ['en', 'uk'] as const;
export type TemplateContentLocale = (typeof TEMPLATE_CONTENT_LOCALES)[number];

export const PACK_KINDS = [...CONTENT_KINDS, 'skillTrees'] as const;
export type PackKind = (typeof PACK_KINDS)[number];

/** Pack kinds whose rows live under another content kind (a skill tree is a part of `skills`) */
export const PACK_KIND_CONTENT: Readonly<Partial<Record<PackKind, string>>> = {
    skillTrees: 'skills',
};

export type IconBucket = (typeof ICON_BUCKETS)[number];

export const TEMPLATE_KEY_PATTERN = /^[a-z0-9][a-z0-9.-]*$/;

export interface TemplateManifest {
    key: string;
    system: string;
    modules?: readonly string[];
    names: Record<TemplateContentLocale, string>;
    locales: readonly TemplateContentLocale[];
    rules: { file: 'rules.json' };
    kinds: readonly PackKind[];
    extras?: readonly string[];
    icons: { bucketByKind?: Partial<Record<PackKind, IconBucket>> };
    compendium?: boolean;
    source?: { repo: string; path: string; sha: string; license: string };
    credits?: string;
    include?: readonly {
        from: string;
        kinds: Partial<Record<PackKind, readonly string[] | 'all'>>;
    }[];
    counts: Partial<Record<PackKind, number>>;
}
