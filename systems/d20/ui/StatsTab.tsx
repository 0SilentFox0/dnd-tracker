'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { RollableCell } from '@/components/character-profile/combat/RollableCell';
import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudPill, HudSectionTitle } from '@/components/hud/page';
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
            <section className="flex flex-col gap-3">
                <HudSectionTitle>{t('abilities')}</HudSectionTitle>
                <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
                    {sheet.abilities.map((a) => {
                        const save = sheet.saves.find(
                            (s) => s.ability === a.key
                        );

                        const body = (
                            <>
                                <small className="hud-sc block text-[11px] tracking-[.1em] text-hud-muted uppercase">
                                    {tg(`abilities.${a.key}.short`)}
                                    {a.isPrimary ? ' ★' : ''}
                                </small>
                                <span
                                    className={cn(
                                        'hud-sc block text-3xl leading-9 tabular-nums',
                                        a.isPrimary
                                            ? 'text-hud-gold'
                                            : 'text-hud-ink'
                                    )}
                                >
                                    {signed(a.mod)}
                                </span>
                                <b className="mx-auto mt-0.5 grid size-7 place-items-center rounded-full border border-hud-rule text-xs text-hud-muted">
                                    {a.score}
                                </b>
                                {save && (
                                    <span
                                        className={cn(
                                            'mx-auto mt-1.5 block w-fit rounded-full px-2 text-[11px] leading-5 tabular-nums',
                                            save.proficient
                                                ? 'bg-hud-gold/15 text-hud-gold shadow-[inset_0_0_0_1px_var(--color-hud-gold)]'
                                                : 'text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-rule)]'
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
                                    'min-w-0 rounded-xl border bg-hud-panel/60 text-center backdrop-blur-sm',
                                    a.isPrimary || save?.proficient
                                        ? 'border-hud-gold'
                                        : 'border-hud-rule'
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
                                        'block min-h-[7rem] w-full min-w-10 rounded-xl px-1 py-2.5'
                                    )
                                ) : (
                                    <div className="min-h-[7rem] px-1 py-2.5">
                                        {body}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {sheet.primaryAbility && (
                    <p className="text-xs text-hud-muted">{t('primaryHint')}</p>
                )}
            </section>
        );
    }

    const passives = [
        ['perception', sheet.passives.perception],
        ['investigation', sheet.passives.investigation],
        ['insight', sheet.passives.insight],
    ] as const;

    const notes = [
        sheet.languages.length
            ? t('languages', { list: sheet.languages.join(', ') })
            : null,
        sheet.proficiencies.length
            ? t('proficiencies', { list: sheet.proficiencies.join(', ') })
            : null,
    ].filter(Boolean);

    return (
        <section className="flex flex-col gap-3">
            <HudSectionTitle>{t('skills')}</HudSectionTitle>
            <ul className="grid gap-x-8 text-sm md:grid-cols-2">
                {sheet.skills.map((s) => (
                    <li key={s.key} className="border-b border-hud-rule">
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
                            'flex min-h-10 w-full items-center gap-2.5 px-1 text-left'
                        )}
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-2">
                {passives.map(([key, value]) => (
                    <HudPill
                        key={key}
                        tone="muted"
                        className="h-auto py-0.5 text-xs"
                    >
                        {t('passiveChip', { skill: tg(`dndSkills.${key}`) })}
                        <b className="text-hud-ink tabular-nums">{value}</b>
                    </HudPill>
                ))}
            </div>
            {notes.length > 0 && (
                <p className="text-xs text-hud-muted">{notes.join(' · ')}</p>
            )}
        </section>
    );
}
