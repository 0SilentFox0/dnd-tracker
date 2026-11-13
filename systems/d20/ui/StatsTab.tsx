'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudSection } from '@/components/hud/form';
import type {
    SheetRollRequest,
    StatsTabProps,
} from '@/components/systems/types';
import type { DndSkill } from '@/lib/constants/skills';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';

export function StatsTab({ section, onRoll, canRoll }: StatsTabProps) {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.combat');

    const tg = useTranslations('gameTerms');

    const rollable = (request: SheetRollRequest, children: ReactNode) =>
        canRoll ? (
            <button
                type="button"
                title={t('roll')}
                onClick={() => onRoll(request)}
                className="flex w-full justify-between gap-2 text-left"
            >
                <span className="sr-only">{t('roll')}: </span>
                {children}
            </button>
        ) : (
            <div className="flex w-full justify-between gap-2">{children}</div>
        );

    if (section === 'top') {
        return (
            <HudSection title={t('abilities')}>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
                    {sheet.abilities.map((a) => (
                        <div
                            key={a.key}
                            className={cn(
                                'min-w-0 rounded-lg border bg-hud-field py-1 text-center',
                                a.isPrimary
                                    ? 'border-hud-gold shadow-[inset_0_0_0_1px_var(--color-hud-gold)]'
                                    : 'border-hud-line'
                            )}
                        >
                            <small className="block text-[10px] text-hud-muted">
                                {tg(`abilities.${a.key}.short`)}
                                {a.isPrimary ? ' ★' : ''}
                            </small>
                            <b className="block text-[17px] leading-5">
                                {a.score}
                            </b>
                            <span
                                className={cn(
                                    'block text-[15px] leading-5 font-semibold tabular-nums',
                                    a.isPrimary
                                        ? 'text-hud-gold'
                                        : 'text-hud-muted'
                                )}
                            >
                                {signed(a.mod)}
                            </span>
                        </div>
                    ))}
                </div>
                {sheet.primaryAbility && (
                    <p className="mt-1.5 text-xs text-hud-muted">
                        {t('primaryHint')}
                    </p>
                )}
            </HudSection>
        );
    }

    return (
        <>
            <HudSection title={t('saves')}>
                <ul className="grid grid-cols-2 gap-x-4 text-sm">
                    {sheet.saves.map((s) => (
                        <li
                            key={s.key}
                            className="border-b border-hud-raised py-1"
                        >
                            {rollable(
                                {
                                    label: t('saveRoll', {
                                        ability: tg(
                                            `abilities.${s.ability}.label`
                                        ),
                                    }),
                                    subject: {
                                        kind: 'save',
                                        ability: s.ability,
                                    },
                                },
                                <>
                                    <span className="min-w-0 truncate">
                                        {s.proficient
                                            ? s.expertise
                                                ? '●● '
                                                : '● '
                                            : ''}
                                        {tg(`abilities.${s.ability}.label`)}
                                        {s.expertise && (
                                            <span className="ml-1 text-xs text-hud-muted">
                                                ×2
                                            </span>
                                        )}
                                    </span>
                                    <span className="tabular-nums">
                                        {signed(s.bonus)}
                                    </span>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </HudSection>
            <HudSection title={t('skills')}>
                <ul className="grid grid-cols-2 gap-x-4 text-sm">
                    {sheet.skills.map((s) => (
                        <li
                            key={s.key}
                            className="border-b border-hud-raised py-1"
                        >
                            {rollable(
                                {
                                    label: tg(`dndSkills.${s.key as DndSkill}`),
                                    subject: {
                                        kind: 'check',
                                        skill: s.key as DndSkill,
                                    },
                                },
                                <>
                                    <span className="min-w-0 truncate">
                                        {s.proficient ? '● ' : ''}
                                        {tg(`dndSkills.${s.key as DndSkill}`)}
                                    </span>
                                    <span className="tabular-nums">
                                        {signed(s.bonus)}
                                    </span>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
                <p className="mt-2 text-xs text-hud-muted">
                    {t('passives', sheet.passives)}
                </p>
                {(sheet.languages.length > 0 ||
                    sheet.proficiencies.length > 0) && (
                    <p className="mt-1 text-xs text-hud-muted">
                        {[
                            sheet.languages.length
                                ? t('languages', {
                                      list: sheet.languages.join(', '),
                                  })
                                : null,
                            sheet.proficiencies.length
                                ? t('proficiencies', {
                                      list: sheet.proficiencies.join(', '),
                                  })
                                : null,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                )}
            </HudSection>
        </>
    );
}
