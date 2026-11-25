'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { SpellIcon } from '@/components/spells/SpellIcon';
import { ROMAN_NUMERALS } from '@/lib/constants/spells';
import { useBattleScene, useBattleSpellLibrary } from '@/lib/hooks/battle';
import { byName } from '@/lib/utils/common/text';
import type { BattleParticipant } from '@/types/battle';
import type { BookSpell } from '@/types/spells';

const MAX_RECOMMENDED = 3;

// native spells first, then stronger dice, then name: stable and explainable
const byStrength = (a: BookSpell, b: BookSpell) =>
    Number(b.executionMode === 'native') -
        Number(a.executionMode === 'native') ||
    (b.dice ?? 0) - (a.dice ?? 0) ||
    byName(a, b);

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
                      .sort(byStrength)
                      .slice(0, MAX_RECOMMENDED),
        [spells, level]
    );

    if (level === null || list.length === 0) return null;

    return (
        <div role="group" aria-label={t('recommended')} className="min-w-0">
            <h3 className="hud-sc mb-1.5 text-[12px] tracking-[.06em] text-[var(--gold)]">
                {t('recommendedTitle', {
                    level: ROMAN_NUMERALS[level] ?? String(level),
                })}
            </h3>
            <div className="flex gap-1.5">
                {list.map((s) => (
                    <HudButton
                        key={s.id}
                        type="button"
                        disabled={!canCast}
                        aria-disabled={!canCast}
                        onClick={() => intents.requestSpellBook(level)}
                        className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/20 px-1.5 py-1 text-[var(--ink)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none"
                    >
                        <SpellIcon spell={s} size={22} className="size-[22px]" iconClassName="size-5" />
                        <span className="max-w-full truncate text-[11px] leading-tight">
                            {s.name}
                        </span>
                    </HudButton>
                ))}
            </div>
        </div>
    );
}
