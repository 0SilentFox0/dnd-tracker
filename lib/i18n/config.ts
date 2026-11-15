import { CORE_NAMESPACES } from '@/lib/i18n/core-namespaces';
import {
    type SystemNamespace,
    systemNamespaces,
} from '@/lib/utils/rules/systems/meta';

export const LOCALES = ['uk', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uk';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_CHANGE_EVENT = 'locale-change';

export const APP_TIME_ZONE = 'UTC';

export { CORE_NAMESPACES };

export type Namespace = (typeof CORE_NAMESPACES)[number] | SystemNamespace;

export const NAMESPACES: readonly Namespace[] = [
    ...CORE_NAMESPACES,
    ...(systemNamespaces() as readonly SystemNamespace[]),
];

export const SERVER_NAMESPACES = [
    'errors',
    'assistant',
    'compendiumReport',
] as const satisfies readonly Namespace[];

export function isLocale(value: unknown): value is Locale {
    return (
        typeof value === 'string' &&
        (LOCALES as readonly string[]).includes(value)
    );
}
