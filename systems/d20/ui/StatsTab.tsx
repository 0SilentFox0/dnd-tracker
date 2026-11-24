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
import { cn } from '@/lib/utils';
import { stagger } from '@/lib/utils/common/motion';

export function StatsTab({ section, onRoll, canRoll }: StatsTabProps) {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.combat');

    const tg = useTranslations('gameTerms');

    const roll: RollProps = { canRoll, onRoll };

    if (section === 'top') {
        return (
            <section
                aria-label={t('abilities')}
                className="overflow-hidden rounded-[4px] border border-hud-line bg-hud-rule shadow-sm"
            >
                <div className="grid grid-cols-3 gap-px lg:grid-cols-6">
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

    const panel =
        'overflow-hidden rounded-[4px] border border-hud-line bg-hud-panel shadow-sm';

    return (
        <div className="flex flex-col gap-6">
            <section className="motion-rise flex flex-col gap-3">
                <HudSheetHeading
                    legend={
                        <>
                            <Mark count={1} />
                            {t('proficient')}
                            <Mark count={2} />
                            {t('expertise')}
                            {canRoll && (
                                <span className="ml-3 text-hud-muted max-sm:hidden">
                                    {t('tapToRoll')}
                                </span>
                            )}
                        </>
                    }
                >
                    {t('skills')}
                </HudSheetHeading>
                <div className={cn(panel, 'px-3')}>
                    <ul className="-mb-px grid gap-x-8 text-[15px] md:grid-cols-2">
                        {sheet.skills.map((s) => (
                            <SkillRow key={s.key} skill={s} roll={roll} />
                        ))}
                    </ul>
                </div>
            </section>
            <section
                style={stagger(2)}
                className="motion-rise flex flex-col gap-3"
            >
                <HudSheetHeading>{t('passives')}</HudSheetHeading>
                <dl
                    className={cn(
                        panel,
                        'grid grid-cols-3 divide-x divide-hud-rule py-3'
                    )}
                >
                    {passives.map(([key, value]) => (
                        <div
                            key={key}
                            className="flex min-w-0 flex-col-reverse items-center px-2 text-center"
                        >
                            <dt className="max-w-full truncate text-sm text-hud-muted">
                                {tg(`dndSkills.${key}`)}
                            </dt>
                            <dd className="hud-num text-3xl text-hud-ink">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>
            {notes.length > 0 && (
                <section
                    style={stagger(3)}
                    className="motion-rise flex flex-col gap-3"
                >
                    <HudSheetHeading>{t('langsProfs')}</HudSheetHeading>
                    <div
                        className={cn(
                            panel,
                            'divide-y divide-hud-rule px-4 text-[15px] text-hud-text'
                        )}
                    >
                        {notes.map((n) => (
                            <p key={n} className="py-3">
                                {n}
                            </p>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
