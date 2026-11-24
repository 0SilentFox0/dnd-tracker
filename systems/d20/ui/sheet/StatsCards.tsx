'use client';

import { useTranslations } from 'next-intl';

import { RollableCell } from '@/components/character-profile/combat/RollableCell';
import type { SheetRollRequest } from '@/components/systems/types';
import type { DndSkill } from '@/lib/constants/skills';
import { useCountUp } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';
import { stagger } from '@/lib/utils/common/motion';
import type { SheetAbility, SheetCheck } from '@/types/characters';

export interface RollProps {
    canRoll: boolean;
    onRoll: (request: SheetRollRequest) => void;
}

export function Mark({ count }: { count: 0 | 1 | 2 }) {
    return (
        <span aria-hidden className="flex w-5 shrink-0 items-center gap-0.5">
            {Array.from({ length: count || 1 }, (_, i) => (
                <i
                    key={i}
                    className={cn(
                        'size-2.5 rotate-45 rounded-[2px] border-[1.5px]',
                        count
                            ? 'border-hud-gold bg-hud-gold'
                            : 'border-hud-muted'
                    )}
                />
            ))}
        </span>
    );
}

function Signed({ value }: { value: number }) {
    return <>{signed(useCountUp(value))}</>;
}

export function AbilityCard({
    ability: a,
    save,
    index,
    roll: { canRoll, onRoll },
}: {
    ability: SheetAbility;
    save?: SheetCheck;
    index: number;
    roll: RollProps;
}) {
    const t = useTranslations('characterProfile.combat');

    const tg = useTranslations('gameTerms');

    const saveRow = save && (
        <>
            <Mark count={save.proficient ? 1 : 0} />
            <span className="sr-only">
                {save.proficient ? `${t('proficient')}: ` : ''}
            </span>
            <span>{t('saveShort')}</span>
            <b
                className={cn(
                    'tabular-nums',
                    save.proficient ? 'text-hud-gold' : 'text-hud-text'
                )}
            >
                <Signed value={save.bonus} />
            </b>
        </>
    );

    return (
        <div
            style={stagger(index)}
            className={cn(
                'motion-rise motion-lift relative grid min-w-0 justify-items-center gap-0.5 rounded-xl border bg-hud-panel px-2 pt-4 pb-1 text-center',
                a.isPrimary || save?.proficient
                    ? 'border-hud-gold'
                    : 'border-hud-rule'
            )}
        >
            {a.isPrimary && (
                <span className="absolute -top-2.5 left-1/2 h-5 -translate-x-1/2 rounded-md border border-hud-line bg-hud-raised px-2 text-xs leading-5 font-bold whitespace-nowrap text-hud-ink">
                    {t('primary')}
                </span>
            )}
            <small className="hud-sc text-[13px] tracking-[.08em] text-hud-muted uppercase">
                {tg(`abilities.${a.key}.short`)}
            </small>
            <span className="hud-sc text-4xl leading-tight text-hud-ink tabular-nums max-sm:text-3xl">
                <Signed value={a.mod} />
            </span>
            <span className="text-sm text-hud-muted">
                {t('score', { n: a.score })}
            </span>
            {saveRow &&
                (canRoll ? (
                    <RollableCell
                        canRoll
                        onRoll={() =>
                            onRoll({
                                label: t('saveRoll', {
                                    ability: tg(`abilities.${a.key}.label`),
                                }),
                                subject: { kind: 'save', ability: a.key },
                            })
                        }
                        title={t('roll')}
                        className="motion-press mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border-t border-hud-rule text-sm text-hud-muted hover:bg-hud-raised"
                    >
                        <span className="sr-only">{t('roll')}: </span>
                        {saveRow}
                    </RollableCell>
                ) : (
                    <div className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-hud-rule text-sm text-hud-muted">
                        {saveRow}
                    </div>
                ))}
        </div>
    );
}

export function SkillRow({
    skill: s,
    roll: { canRoll, onRoll },
}: {
    skill: SheetCheck;
    roll: RollProps;
}) {
    const t = useTranslations('characterProfile.combat');

    const tg = useTranslations('gameTerms');

    const name = tg(`dndSkills.${s.key as DndSkill}`);

    const level = s.expertise ? 2 : s.proficient ? 1 : 0;

    return (
        <li className="border-b border-hud-rule">
            <RollableCell
                canRoll={canRoll}
                onRoll={() =>
                    onRoll({
                        label: name,
                        subject: { kind: 'check', skill: s.key as DndSkill },
                    })
                }
                title={t('roll')}
                className="motion-press flex min-h-11 w-full items-center gap-2.5 px-2 text-left hover:bg-hud-raised"
            >
                {canRoll && <span className="sr-only">{t('roll')}: </span>}
                <Mark count={level} />
                {level > 0 && (
                    <span className="sr-only">
                        {t(level === 2 ? 'expertise' : 'proficient')}:{' '}
                    </span>
                )}
                <span
                    className={cn(
                        'min-w-0 flex-1 truncate',
                        level ? 'font-medium text-hud-ink' : 'text-hud-text'
                    )}
                >
                    {name}
                </span>
                <span className="text-xs tracking-[.06em] text-hud-muted uppercase">
                    {tg(`abilities.${s.ability}.short`)}
                </span>
                <span
                    className={cn(
                        'w-9 text-right text-base tabular-nums',
                        level ? 'font-bold text-hud-ink' : 'text-hud-muted'
                    )}
                >
                    <Signed value={s.bonus} />
                </span>
            </RollableCell>
        </li>
    );
}
