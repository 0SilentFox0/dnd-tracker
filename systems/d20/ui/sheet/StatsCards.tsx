'use client';

import { useTranslations } from 'next-intl';
import {
    Brain,
    Drama,
    Dumbbell,
    Eye,
    Heart,
    type LucideIcon,
    Wind,
} from 'lucide-react';

import { RollableCell } from '@/components/character-profile/combat/RollableCell';
import type { SheetRollRequest } from '@/components/systems/types';
import type { DndSkill } from '@/lib/constants/skills';
import { useCountUp } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';
import { stagger } from '@/lib/utils/common/motion';
import type { SheetAbility, SheetCheck } from '@/types/characters';

const ABILITY_ICONS: Record<string, LucideIcon> = {
    strength: Dumbbell,
    dexterity: Wind,
    constitution: Heart,
    intelligence: Brain,
    wisdom: Eye,
    charisma: Drama,
};

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
                        'size-2 rotate-45 rounded-[1px] border-[1.5px]',
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

    const label = tg(`abilities.${a.key}.label`);

    const Icon = ABILITY_ICONS[a.key];

    const saveRow = save && (
        <>
            <Mark count={save.proficient ? 1 : 0} />
            <span className="sr-only">
                {save.proficient ? `${t('proficient')}: ` : ''}
            </span>
            <span>{t('saveShort')}</span>
            <b
                className={cn(
                    'hud-num text-[17px]',
                    save.proficient ? 'text-hud-gold' : 'text-hud-text'
                )}
            >
                <Signed value={save.bonus} />
            </b>
        </>
    );

    const saveClass =
        'flex min-h-11 w-full items-center justify-center gap-2 border-t border-hud-rule text-sm text-hud-muted';

    return (
        <div
            style={stagger(index)}
            className="motion-rise relative grid min-w-0 content-start bg-hud-panel"
        >
            {a.isPrimary && (
                <>
                    <span
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-[3px] bg-hud-gold"
                    />
                    <span className="sr-only">{t('primary')}</span>
                </>
            )}
            <RollableCell
                canRoll={canRoll}
                onRoll={() =>
                    onRoll({
                        label,
                        subject: { kind: 'check', ability: a.key },
                    })
                }
                title={t('roll')}
                className="motion-press grid min-h-11 justify-items-center gap-1 px-1 pt-3.5 pb-3 hover:bg-hud-raised"
            >
                {canRoll && <span className="sr-only">{t('roll')}: </span>}
                <small className="hud-title flex max-w-full items-center gap-1.5 text-base text-hud-text lg:text-xl">
                    {Icon && (
                        <Icon
                            aria-hidden
                            className="size-5 shrink-0 text-hud-muted max-sm:hidden"
                        />
                    )}
                    <span className="truncate max-sm:hidden">{label}</span>
                    <span className="sm:hidden">
                        {tg(`abilities.${a.key}.short`)}
                    </span>
                </small>
                <span className="hud-num text-4xl leading-none text-hud-ink sm:text-[42px]">
                    <Signed value={a.mod} />
                </span>
                <span className="hud-num rounded-[4px] border border-hud-line bg-hud-raised px-2.5 text-sm leading-6 text-hud-ink">
                    {t('score', { n: a.score })}
                </span>
            </RollableCell>
            {saveRow &&
                (canRoll ? (
                    <RollableCell
                        canRoll
                        onRoll={() =>
                            onRoll({
                                label: t('saveRoll', { ability: label }),
                                subject: { kind: 'save', ability: a.key },
                            })
                        }
                        title={t('roll')}
                        className={cn(
                            saveClass,
                            'motion-press hover:bg-hud-raised'
                        )}
                    >
                        <span className="sr-only">{t('roll')}: </span>
                        {saveRow}
                    </RollableCell>
                ) : (
                    <div className={saveClass}>{saveRow}</div>
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
                className="motion-press flex min-h-11 w-full items-center gap-3 px-2 text-left hover:bg-hud-raised"
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
                        'hud-num w-9 text-right text-[17px]',
                        level ? 'font-bold text-hud-ink' : 'text-hud-muted'
                    )}
                >
                    <Signed value={s.bonus} />
                </span>
            </RollableCell>
        </li>
    );
}
