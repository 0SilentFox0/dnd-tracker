'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { useBattleScene, useBattleSpellLibrary } from '@/lib/hooks/battle';
import { byName } from '@/lib/utils/common/text';
import type { BattleParticipant } from '@/types/battle';

const MAX_RECOMMENDED = 4;

export function RecommendedSpells({
    hero,
    level,
    canCast,
}: {
    hero: BattleParticipant;
    level: number | null;
    canCast: boolean;
}) {
    const t = useTranslations('battle.hero.slots');

    const { intents } = useBattleScene();

    const spells = useBattleSpellLibrary(hero, {
        isOpen: level !== null,
        free: false,
    });

    const list = useMemo(
        () =>
            level === null
                ? []
                : spells
                      .filter((s) => s.level === level)
                      .sort(byName)
                      .slice(0, MAX_RECOMMENDED),
        [spells, level]
    );

    if (level === null || list.length === 0) return null;

    return (
        <div
            role="group"
            aria-label={t('recommended')}
            className="flex flex-wrap gap-1"
        >
            {list.map((s) => (
                <HudButton
                    key={s.id}
                    type="button"
                    disabled={!canCast}
                    aria-disabled={!canCast}
                    onClick={() => intents.requestSpellBook(level)}
                    className="min-h-9 max-w-full truncate rounded-full border border-white/20 px-3 text-sm text-[var(--ink)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none md:min-h-10"
                >
                    {s.name}
                </HudButton>
            ))}
        </div>
    );
}
