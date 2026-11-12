import { classOf, isTranslatable } from '@/lib/utils/templates/i18n/catalog';
import { mapKeyed, type TranslationsV2 } from '@/lib/utils/templates/i18n/keys';
import {
    attackNames,
    nameNormalizerOf,
    translateAt,
    translatedNames,
} from '@/lib/utils/templates/i18n/overlay';

const REF_KEYS: Readonly<Record<string, string>> = {
    spellId: 'spells',
    groupId: 'spell-groups',
    school: 'spell-groups',
    lists: 'classes',
    spellList: 'classes',
    originFeatId: 'feats',
    bases: 'artifacts',
};

export function applyOverlay<T extends object>(
    source: T,
    tr: TranslationsV2,
    kinds: readonly string[]
): T {
    if (!Object.keys(tr).length) return source;

    const data = source as Record<string, readonly unknown[] | undefined>;

    const rows = (kind: string): readonly unknown[] => data[kind] ?? [];

    const maps: Record<string, Map<string, string>> = Object.fromEntries(
        kinds.map((kind) => [
            kind,
            translatedNames(rows(kind), kind, tr, kind, nameNormalizerOf(kind)),
        ])
    );

    const attacks = rows('units').map((row) => attackNames(row, 'units', tr));

    const out: Record<string, unknown> = { ...data };

    for (const kind of kinds) {
        out[kind] = rows(kind).map((row, index) => {
            const slug = (row as { slug: string }).slug;

            return mapKeyed(row, ({ fieldPath, key, parent, path, text }) => {
                if (
                    kind === 'units' &&
                    parent === 'perform' &&
                    key === 'attack'
                )
                    return attacks[index].get(text.toLowerCase()) ?? text;

                const refKind = REF_KEYS[key];

                if (refKind)
                    return (
                        maps[refKind]?.get(
                            refKind === 'artifacts'
                                ? text.trim().toLowerCase()
                                : text
                        ) ?? text
                    );

                return classOf(key, parent, path) && isTranslatable(text)
                    ? translateAt(tr, `${kind}/${slug}/${fieldPath}`, text)
                    : text;
            });
        });
    }

    return out as T;
}
