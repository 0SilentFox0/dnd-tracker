import { classChoiceDefs } from '@/lib/utils/characters/choices/class-choices';
import type { StartingKit } from '@/types/choices';
import type { CharacterClassEntry, GameClassData } from '@/types/classes';

/** Only the first class carries a starting package; the pick stays on the entry as history. */
export function pickedKit(
    classes: readonly CharacterClassEntry[],
    classesById: Readonly<Record<string, GameClassData>>
): StartingKit | null {
    const entry = classes[0];

    const cls = entry && classesById[entry.classId];

    if (!cls) return null;

    const subclass = cls.subclasses.find((s) => s.id === entry.subclassId);

    for (const choice of classChoiceDefs(cls, subclass ?? null)) {
        if (!choice.atCreation) continue;

        const pickId = entry.choices?.[choice.id]?.[0]?.id;

        const kit = choice.options?.find((o) => o.id === pickId)?.kit;

        if (kit) return kit;
    }

    return null;
}
