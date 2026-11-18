import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';

const LEGACY = new Map(
    (SYSTEM_META as readonly SystemMeta[]).flatMap((meta) =>
        Object.entries(meta.i18n.legacyKeys ?? {})
    )
);

const PREFIXES = [...LEGACY].filter(([old]) => old.endsWith('.'));

/** Stored rows keep the keys written before module log texts moved to `<module>Log` scopes */
export function currentLogKey(message: string): string {
    const exact = LEGACY.get(message);

    if (exact) return exact;

    const prefix = PREFIXES.find(([old]) => message.startsWith(old));

    return prefix ? `${prefix[1]}${message.slice(prefix[0].length)}` : message;
}
