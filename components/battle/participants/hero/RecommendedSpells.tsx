'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { SpellIcon } from '@/components/spells/SpellIcon';
import { ROMAN_NUMERALS } from '@/lib/constants/spells';
import { useBattleScene } from '@/lib/hooks/battle';
import { byName } from '@/lib/utils/common/text';
import type { BookSpell } from '@/types/spells';

const MAX_RECOMMENDED = 5;

// native spells first, then stronger dice, then name: stable and explainable
const byStrength = (a: BookSpell, b: BookSpell) =>
    Number(b.executionMode === 'native') -
        Number(a.executionMode === 'native') ||
    (b.dice ?? 0) - (a.dice ?? 0) ||
    byName(a, b);

export function RecommendedSpells({
    spells,
    level,
    compact = false,
    actionLeft = true,
}: {
    spells: BookSpell[];
    level: number | null;
    compact?: boolean;
    actionLeft?: boolean;
}) {
    const t = useTranslations('battle.hero.slots');

    const { intents, turn } = useBattleScene();

    const canCast = turn.isMyTurn && actionLeft;

    const list = useMemo(
        () =>
            spells
                .filter((s) => level === null || s.level === level)
                .sort(byStrength)
                .slice(0, MAX_RECOMMENDED),
        [spells, level]
    );

    if (list.length === 0) return null;

    return (
        <div role="group" aria-label={t('recommended')} className="min-w-0">
            <h3 className="hud-sc mb-1.5 text-[12px] tracking-[.06em] text-[#ecd78d] [text-shadow:0_1px_3px_#000,0_0_2px_#000]">
                {level === null
                    ? t('recommended')
                    : t('recommendedTitle', {
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
                        onClick={() =>
                            intents.requestSpellBook(level ?? s.level)
                        }
                        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[#e6dccb] [text-shadow:0_1px_3px_#000,0_0_2px_#000] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                    >
                        <SpellIcon
                            spell={s}
                            size={compact ? 44 : 66}
                            className={compact ? 'size-11' : 'size-[66px]'}
                            iconClassName={compact ? 'size-9' : 'size-14'}
                        />
                        <span className="max-w-full truncate text-[11px] leading-tight">
                            {s.name}
                        </span>
                    </HudButton>
                ))}
            </div>
        </div>
    );
}
