import type { SystemI18n } from './meta';

export const i18nNamespaces = ({
    battle,
    campaign,
    member,
    dm,
    pages,
}: SystemI18n): string[] => [
    ...(battle ?? []),
    ...(campaign ?? []),
    ...(member ?? []),
    ...(dm ?? []),
    ...Object.values(pages ?? {}).flat(),
];
