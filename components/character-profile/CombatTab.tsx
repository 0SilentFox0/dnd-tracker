'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crosshair, Swords } from 'lucide-react';

import { SheetRollDialog, type SheetRollRequest } from './rest/SheetRollDialog';
import { Breakdown } from './Breakdown';
import { CombatRow } from './CombatRow';
import { useProfile } from './ProfileContext';

import { EmptyState } from '@/components/common/states';
import { HudSection } from '@/components/hud/form';
import { systemUiOf } from '@/components/systems';
import { AttackType } from '@/lib/constants/battle';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { signed } from '@/lib/utils/common/format';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

export function CombatTab() {
    const { campaignId, sheet } = useProfile();

    const t = useTranslations('characterProfile.combat');

    const tg = useTranslations('gameTerms');

    const { data: rules } = useCampaignRules(campaignId);

    const { def: system, system: ref } = useCampaignSystem(
        campaignId,
        sheet.system
    );

    const Ui = systemUiOf(ref.key, ref.modules);

    const armorStats = statColumnsOf(system).has('armorClass');

    const [openAttack, setOpenAttack] = useState<string | null>(null);

    const [rollRequest, setRollRequest] = useState<SheetRollRequest | null>(
        null
    );

    const canRoll = !!sheet.rest && (sheet.viewer.isOwner || sheet.viewer.isDM);

    return (
        <>
            <Ui.StatsTab
                section="top"
                onRoll={setRollRequest}
                canRoll={canRoll}
            />
            {system.attacks && (
                <HudSection title={t('attacks')}>
                    {sheet.attacks.length === 0 ? (
                        <EmptyState
                            title={t('noAttacks')}
                            className="border-hud-rule py-6 text-hud-muted"
                        />
                    ) : (
                        sheet.attacks.map((a) => (
                            <div
                                key={a.id}
                                className="mb-1.5 rounded-[10px] border border-hud-line bg-hud-field px-2.5 py-2"
                            >
                                <button
                                    type="button"
                                    aria-expanded={openAttack === a.id}
                                    onClick={() =>
                                        setOpenAttack((v) =>
                                            v === a.id ? null : a.id
                                        )
                                    }
                                    className="flex min-h-10 w-full flex-wrap items-center justify-between gap-x-2 text-left"
                                >
                                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                                        {a.kind === AttackType.RANGED ? (
                                            <Crosshair className="size-4 shrink-0" />
                                        ) : (
                                            <Swords className="size-4 shrink-0" />
                                        )}
                                        {a.name}
                                    </span>
                                    <span className="shrink-0 text-sm whitespace-nowrap text-hud-muted">
                                        <b className="text-lg text-hud-ink">
                                            {signed(a.toHit.total)}
                                        </b>{' '}
                                        {t('hitShort')} ·{' '}
                                        <b className="text-lg text-hud-ink">
                                            ≈{a.avgDamage.total}
                                        </b>{' '}
                                        {t('damage')}
                                    </span>
                                </button>
                                {openAttack === a.id && (
                                    <>
                                        <p className="mt-2 text-[11px] text-hud-gold uppercase">
                                            {t('toHit')}
                                        </p>
                                        <Breakdown lines={a.toHit.lines} />
                                        <p className="mt-2 text-[11px] text-hud-gold uppercase">
                                            {t('avgDamage')}
                                        </p>
                                        <Breakdown lines={a.avgDamage.lines} />
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </HudSection>
            )}
            <HudSection title={t('defense')}>
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
            <Ui.StatsTab
                section="bottom"
                onRoll={setRollRequest}
                canRoll={canRoll}
            />
            {canRoll && (
                <SheetRollDialog
                    request={rollRequest}
                    onClose={() => setRollRequest(null)}
                />
            )}
        </>
    );
}
