'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { RollableCell } from '@/components/character-profile/combat/RollableCell';
import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudSection } from '@/components/hud/form';
import type {
    SheetRollRequest,
    StatsTabProps,
} from '@/components/systems/types';
import type { DndSkill } from '@/lib/constants/skills';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';

function Diamonds({ count }: { count: 0 | 1 | 2 }) {
    return (
        <span
            aria-hidden
            className="flex w-5 shrink-0 items-center justify-center gap-0.5"
        >
            {count === 0 ? (
                <i className="size-2 rotate-45 border border-hud-line" />
            ) : (
                Array.from({ length: count }, (_, i) => (
                    <i key={i} className="size-2 rotate-45 bg-hud-gold" />
                ))
            )}
        </span>
    );
}

export function StatsTab({ section, onRoll, canRoll }: StatsTabProps) {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.combat');

    const tg = useTranslations('gameTerms');

    const rollable = (
        request: SheetRollRequest,
        children: ReactNode,
        className: string
    ) => (
        <RollableCell
            canRoll={canRoll}
            onRoll={() => onRoll(request)}
            title={t('roll')}
            className={className}
        >
            {canRoll && <span className="sr-only">{t('roll')}: </span>}
            {children}
        </RollableCell>
    );

    if (section === 'top') {
        return (
            <HudSection title={t('abilities')}>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                    {sheet.abilities.map((a) => {
                        const save = sheet.saves.find(
                            (s) => s.ability === a.key
                        );

                        const body = (
                            <>
                                <small className="block text-[10px] text-hud-muted">
                                    {tg(`abilities.${a.key}.short`)}
                                    {a.isPrimary ? ' ★' : ''}
                                </small>
                                <span
                                    className={cn(
                                        'block text-xl leading-6 font-bold tabular-nums',
                                        a.isPrimary && 'text-hud-gold'
                                    )}
                                >
                                    {signed(a.mod)}
                                </span>
                                <b className="block text-xs text-hud-muted">
                                    {a.score}
                                </b>
                                {save && (
                                    <span
                                        className={cn(
                                            'mt-0.5 block text-[11px] tabular-nums',
                                            save.proficient
                                                ? 'text-hud-gold'
                                                : 'text-hud-muted'
                                        )}
                                    >
                                        {`${t('saveShort')} ${signed(save.bonus)}`}
                                    </span>
                                )}
                            </>
                        );

                        return (
                            <div
                                key={a.key}
                                className={cn(
                                    'min-w-0 rounded-xl border bg-hud-field text-center',
                                    a.isPrimary || save?.proficient
                                        ? 'border-hud-gold'
                                        : 'border-hud-line',
                                    a.isPrimary &&
                                        'shadow-[inset_0_0_0_1px_var(--color-hud-gold)]'
                                )}
                            >
                                {save ? (
                                    rollable(
                                        {
                                            label: t('saveRoll', {
                                                ability: tg(
                                                    `abilities.${a.key}.label`
                                                ),
                                            }),
                                            subject: {
                                                kind: 'save',
                                                ability: save.ability,
                                            },
                                        },
                                        body,
                                        'block min-h-[4.5rem] w-full min-w-10 rounded-xl px-1 py-1.5'
                                    )
                                ) : (
                                    <div className="min-h-[4.5rem] px-1 py-1.5">
                                        {body}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
        <HudSection title={t('skills')}>
            <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {sheet.skills.map((s) => (
                    <li
                        key={s.key}
                        className="rounded-xl border border-hud-line bg-hud-field"
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
                                <Diamonds
                                    count={
                                        s.expertise ? 2 : s.proficient ? 1 : 0
                                    }
                                />
                                <span className="min-w-0 flex-1 truncate">
                                    {tg(`dndSkills.${s.key as DndSkill}`)}
                                </span>
                                <span className="font-semibold tabular-nums">
                                    {signed(s.bonus)}
                                </span>
                            </>,
                            'flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 text-left'
                        )}
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-hud-muted">
                {t('passives', sheet.passives)}
            </p>
            {(sheet.languages.length > 0 || sheet.proficiencies.length > 0) && (
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
    );
}
