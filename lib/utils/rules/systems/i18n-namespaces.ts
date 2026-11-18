import type { SystemI18n } from './meta';

export const i18nNamespaces = ({
    battle,
    campaign,
    member,
    dm,
    rules,
    pages,
}: SystemI18n): string[] => [
    ...(battle ?? []),
    ...(campaign ?? []),
    ...(member ?? []),
    ...(dm ?? []),
    ...(rules ?? []),
    ...Object.values(pages ?? {}).flat(),
];
