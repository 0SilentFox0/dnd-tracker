import {
    SYSTEM_META,
    type SystemMeta,
    type VocabKind,
    type VocabShapes,
} from '@/lib/utils/rules/systems/meta';

export type { VocabKind, VocabShapes };

export type VocabEntry<K extends VocabKind> = VocabShapes[K];

type Metas = (typeof SYSTEM_META)[number];

export type ModuleVocabId<K extends VocabKind> = Metas extends infer M
    ? M extends {
          readonly vocab: {
              readonly [P in K]: readonly { readonly id: infer I }[];
          };
      }
        ? I
        : never
    : never;

const entries = new Map<VocabKind, readonly VocabEntry<VocabKind>[]>();

/** Entries of every installed module, not only the campaign's composition, so stored data renders with a module off */
export function moduleVocab<K extends VocabKind>(
    kind: K
): readonly VocabEntry<K>[] {
    const cached = entries.get(kind);

    if (cached) return cached as readonly VocabEntry<K>[];

    const seen = new Set<string>();

    const out: VocabEntry<K>[] = [];

    for (const meta of SYSTEM_META as readonly SystemMeta[]) {
        for (const entry of (meta.vocab?.[kind] ??
            []) as readonly VocabEntry<K>[]) {
            if (seen.has(entry.id)) continue;

            seen.add(entry.id);
            out.push(entry);
        }
    }

    entries.set(kind, out);

    return out;
}

export const vocabIds = (kind: VocabKind): ReadonlySet<string> =>
    new Set(moduleVocab(kind).map((e) => e.id));
