'use client';

import { useTranslations } from 'next-intl';

import { AttackRow } from '../combat/AttackRow';
import { CombatRow } from '../combat/CombatRow';
import { useProfile } from '../ProfileContext';

import { EmptyState } from '@/components/common/states';
import { HudSection } from '@/components/hud/form';
import { HudSheetHeading } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

export function CombatTab() {
    const { campaignId, sheet } = useProfile();

    const t = useTranslations('characterProfile.combat');

    const tg = useTranslations('gameTerms');

    const tr = useTranslations('rest.badges');

    const { data: rules } = useCampaignRules(campaignId);

    const { def: system, system: ref } = useCampaignSystem(
        campaignId,
        sheet.system
    );

    const Ui = systemUiOf(ref.key, ref.modules);

    const armorStats = statColumnsOf(system).has('armorClass');

    return (
        <>
            {system.attacks && (
                <HudSection
                    panel
                    header={<HudSheetHeading>{t('attacks')}</HudSheetHeading>}
                    className="motion-rise [--i:0]"
                >
                    {sheet.attacks.length === 0 ? (
                        <EmptyState
                            title={t('noAttacks')}
                            className="border-hud-rule py-6 text-hud-muted"
                        />
                    ) : (
                        sheet.attacks.map((a, i) => (
                            <AttackRow key={a.id} attack={a} index={i} />
                        ))
                    )}
                </HudSection>
            )}
            <HudSection
                panel
                header={<HudSheetHeading>{t('defense')}</HudSheetHeading>}
                className="motion-rise [--i:1]"
            >
                {armorStats && (
                    <>
                        <CombatRow
                            label="AC"
                            value={String(sheet.armorClass.total)}
                            lines={sheet.armorClass.lines}
                        />
                        <CombatRow
                            label={tg('stats.initiative')}
                            value={String(sheet.initiative)}
                        />
                        <CombatRow
                            label={tg('stats.speed')}
                            value={String(sheet.speed)}
                        />
                    </>
                )}
                {rules &&
                    Ui.sheet?.combatRows?.map((Extra, i) => (
                        <Extra key={i} sheet={sheet} rules={rules} />
                    ))}
                {system.attacks && (
                    <CombatRow
                        label={t('targets')}
                        value={
                            sheet.targets.min === sheet.targets.max
                                ? String(sheet.targets.max)
                                : `${sheet.targets.min}–${sheet.targets.max}`
                        }
                    />
                )}
                {sheet.immunities.length > 0 && (
                    <CombatRow
                        label={t('immunities')}
                        value={sheet.immunities.join(', ')}
                    />
                )}
            </HudSection>
            {sheet.rest && (
                <HudSection
                    panel
                    header={<HudSheetHeading>{t('state')}</HudSheetHeading>}
                    className="motion-rise [--i:2]"
                >
                    <CombatRow
                        label={t('exhaustionLevel')}
                        value={`${sheet.rest.exhaustion} / 6`}
                    />
                    {sheet.rest.dead && (
                        <CombatRow label={tr('dead')} value={'\u2020'} />
                    )}
                </HudSection>
            )}
        </>
    );
}
