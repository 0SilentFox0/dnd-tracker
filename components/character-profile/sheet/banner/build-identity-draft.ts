import type { IdentityDraft } from './IdentityDraft';

import type { CharacterFormData } from '@/types/characters';
import type { GameClassData } from '@/types/classes';
import type { Race } from '@/types/races';

export function buildIdentityDraft(
    data: CharacterFormData['basicInfo'],
    lookup: { races: Race[]; classesById: Record<string, GameClassData> }
): IdentityDraft {
    const entries = (data.classes ?? []).filter((e) => e.classId);

    const resolved = entries.map((e) => lookup.classesById[e.classId]);

    const first = entries[0];

    const subclass =
        entries.length === 1 && first?.subclassId
            ? (resolved[0]?.subclasses.find((s) => s.id === first.subclassId)
                  ?.name ?? '')
            : (data.subclass ?? '');

    const race = lookup.races.find((r) => r.name === data.race);

    return {
        name: data.name,
        race: data.race,
        subrace: data.subrace ?? '',
        className:
            entries.length > 0
                ? resolved
                      .map((c) => c?.name)
                      .filter(Boolean)
                      .join(' / ')
                : data.class,
        subclass,
        alignment: data.alignment ?? '',
        avatar: data.avatar || null,
        level: data.level,
        raceColor: race?.color ?? null,
        raceIcon: race?.icon ?? null,
    };
}

export function overlayIdentity<
    T extends {
        name: string;
        race: string;
        subrace?: string | null;
        className: string;
        subclass: string | null;
        alignment: string | null;
        avatar: string | null;
        level: number;
        raceColor: string | null;
        raceIcon: string | null;
    },
>(saved: T, draft: IdentityDraft | null): T {
    if (!draft) return saved;

    return {
        ...saved,
        name: draft.name || saved.name,
        race: draft.race || saved.race,
        subrace: draft.subrace || undefined,
        className: draft.className || saved.className,
        subclass: draft.subclass || null,
        alignment: draft.alignment || null,
        avatar: draft.avatar,
        level: draft.level,
        raceColor: draft.raceColor ?? saved.raceColor,
        raceIcon: draft.raceIcon ?? saved.raceIcon,
    };
}
