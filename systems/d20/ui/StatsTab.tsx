'use client';

import { useTranslations } from 'next-intl';

import {
    AbilityCard,
    Mark,
    type RollProps,
    SkillRow,
} from './sheet/StatsCards';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudSheetHeading } from '@/components/hud/page';
import type { StatsTabProps } from '@/components/systems/types';
import { stagger } from '@/lib/utils/common/motion';

export function StatsTab({ section, onRoll, canRoll }: StatsTabProps) {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.combat');

    const tg = useTranslations('gameTerms');

    const roll: RollProps = { canRoll, onRoll };

    if (section === 'top') {
        return (
            <section className="flex flex-col gap-4">
                <HudSheetHeading
                    legend={
                        <>
                            <Mark count={1} />
                            {t('saveProficient')}
                        </>
                    }
                >
                    {t('abilities')}
                </HudSheetHeading>
                <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3 lg:grid-cols-6">
                    {sheet.abilities.map((a, i) => (
                        <AbilityCard
                            key={a.key}
                            ability={a}
                            save={sheet.saves.find((s) => s.ability === a.key)}
                            index={i}
                            roll={roll}
                        />
                    ))}
                </div>
                {sheet.primaryAbility && (
                    <p className="text-sm text-hud-muted">{t('primaryHint')}</p>
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
        <div className="mt-8 flex flex-col gap-8">
            <section className="motion-rise flex flex-col gap-3">
                <HudSheetHeading
                    legend={
                        <>
                            <Mark count={1} />
                            {t('proficient')}
                            <Mark count={2} />
                            {t('expertise')}
                        </>
                    }
                >
                    {t('skills')}
                </HudSheetHeading>
                <ul className="grid gap-x-8 text-[15px] md:grid-cols-2">
                    {sheet.skills.map((s) => (
                        <SkillRow key={s.key} skill={s} roll={roll} />
                    ))}
                </ul>
            </section>
            <section
                style={stagger(2)}
                className="motion-rise flex flex-col gap-3"
            >
                <HudSheetHeading>{t('passives')}</HudSheetHeading>
                <dl className="grid grid-cols-3 gap-3">
                    {passives.map(([key, value]) => (
                        <div
                            key={key}
                            className="rounded-xl border border-hud-rule bg-hud-panel px-3 py-2"
                        >
                            <dt className="truncate text-sm text-hud-muted">
                                {tg(`dndSkills.${key}`)}
                            </dt>
                            <dd className="hud-sc text-2xl text-hud-ink tabular-nums">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>
            {notes.length > 0 && (
                <section
                    style={stagger(3)}
                    className="motion-rise flex flex-col gap-2"
                >
                    <HudSheetHeading>{t('langsProfs')}</HudSheetHeading>
                    {notes.map((n) => (
                        <p key={n} className="text-[15px] text-hud-text">
                            {n}
                        </p>
                    ))}
                </section>
            )}
        </div>
    );
}
