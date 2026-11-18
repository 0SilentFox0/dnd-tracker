import type { SystemI18n } from './meta';

export const i18nNamespaces = ({
    battle,
    campaign,
    member,
    dm,
    rules,
    log,
    pages,
}: SystemI18n): string[] => [
    ...(battle ?? []),
    ...(campaign ?? []),
    ...(member ?? []),
    ...(dm ?? []),
    ...(rules ?? []),
    ...(log ?? []),
    ...Object.values(pages ?? {}).flat(),
];
