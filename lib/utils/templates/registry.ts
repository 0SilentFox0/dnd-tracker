import { MANIFESTS } from '@/data/templates/manifests';
import { CampaignKind, CampaignVisibility } from '@/lib/constants/campaigns';
import type {
    TemplateContentLocale,
    TemplateManifest,
} from '@/lib/utils/templates/manifest';

export const TEMPLATE_REGISTRY: Readonly<Record<string, TemplateManifest>> =
    MANIFESTS as unknown as Record<string, TemplateManifest>;

export const DEFAULT_TEMPLATE_KEY = 'srd-5.2-empty';

export const LEGACY_KEY_BY_NAME: Readonly<Record<string, string>> = {
    '5e SRD 5.2': 'srd-5.2',
    'Grim d100': 'grim-d100',
    Heroes: 'heroes-homm',
    '5e (empty)': 'srd-5.2-empty',
    'Grim d100 (empty)': 'grim-d100-empty',
};

export type TemplateIdentity = {
    kind?: string;
    visibility?: string;
    templateKey?: string | null;
    name?: string | null;
    locale?: string | null;
};
export type TemplateLocalization = {
    templateKey: string;
    locales: readonly TemplateContentLocale[];
};

export const templateOf = (key: string): TemplateManifest | undefined =>
    Object.hasOwn(TEMPLATE_REGISTRY, key) ? TEMPLATE_REGISTRY[key] : undefined;

export function templateKeyOf(source: {
    templateKey?: string | null;
    name?: string | null;
}): string | null {
    if (source.templateKey && templateOf(source.templateKey))
        return source.templateKey;

    const legacy = source.templateKey ?? source.name;

    return legacy && Object.hasOwn(LEGACY_KEY_BY_NAME, legacy)
        ? LEGACY_KEY_BY_NAME[legacy]
        : null;
}

export function localizationOf(
    source: TemplateIdentity
): TemplateLocalization | null {
    if (
        source.kind !== CampaignKind.TEMPLATE ||
        source.visibility !== CampaignVisibility.OFFICIAL
    )
        return null;

    const key = templateKeyOf(source);

    const manifest = key ? templateOf(key) : undefined;

    return key && manifest && manifest.locales.length >= 2
        ? { templateKey: key, locales: manifest.locales }
        : null;
}

export const isLocalizableTemplate = (source: TemplateIdentity): boolean =>
    localizationOf(source) !== null;
export const isCanonicalTemplate = (source: TemplateIdentity): boolean =>
    isLocalizableTemplate(source) &&
    (source.locale == null || source.locale === 'en');
export const isLegacyLocalizedTemplate = (source: TemplateIdentity): boolean =>
    isLocalizableTemplate(source) && source.locale === 'uk';

/** Prisma filter matching rows of the given packs, including rows that still carry a legacy name as templateKey (or null). */
export function templateKeyWhere(keys: readonly string[]) {
    const names = Object.entries(LEGACY_KEY_BY_NAME)
        .filter(([, key]) => keys.includes(key))
        .map(([name]) => name);

    return {
        OR: [
            { templateKey: { in: [...keys, ...names] } },
            { templateKey: null, name: { in: names } },
        ],
    };
}

export const compendiumTemplateKeys = (): string[] =>
    Object.values(TEMPLATE_REGISTRY)
        .filter((manifest) => manifest.compendium)
        .map((manifest) => manifest.key);
