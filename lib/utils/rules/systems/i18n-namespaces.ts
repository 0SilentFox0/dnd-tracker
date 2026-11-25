import type { SystemI18n } from './meta';

export const i18nNamespaces = ({
    packs,
    rules,
    log,
    pages,
}: SystemI18n): string[] => [
    ...Object.values(packs ?? {}).flat(),
    ...(rules ?? []),
    ...(log ?? []),
    ...Object.values(pages ?? {}).flat(),
];
