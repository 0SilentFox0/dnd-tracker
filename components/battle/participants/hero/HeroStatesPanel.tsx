'use client';

import { useTranslations } from 'next-intl';

import { EffectLine } from '@/components/battle/hud';
import { useSystemBattleUi } from '@/components/battle/use-system-battle-ui';
import { useFormatDuration } from '@/lib/i18n/use-duration';
import type { DisplayEffect } from '@/lib/utils/battle/view';
import {
    abilityCharges,
    NO_EFFECTS,
    poolViews,
} from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

export function HeroStatesPanel({
    hero,
    effects = NO_EFFECTS,
    round,
}: {
    hero: BattleParticipant;
    effects?: readonly DisplayEffect[];
    round: number;
}) {
    const t = useTranslations('battle.hero.states');

    const tHero = useTranslations('battle.hero');

    const formatDuration = useFormatDuration();

    const { heroPanels, ConditionTestPanel } = useSystemBattleUi();

    const charges = abilityCharges(hero, round);

    const pools = poolViews(hero);

    return (
        <section
            aria-label={t('title')}
            className="flex flex-col gap-2 text-sm text-hud-text"
        >
            {effects.length > 0 ? (
                <EffectLine effects={effects} />
            ) : (
                <span className="text-[var(--hud-muted)] italic">
                    {t('none')}
                </span>
            )}
            {(charges.length > 0 || pools.length > 0) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {charges.map((c) => (
                        <span key={c.key}>
                            {c.name}
                            {c.limit !== null && ` ${c.left}/${c.limit}`}
                            {c.cooldownLeft > 0 &&
                                ` · ${tHero('cooldown', { duration: formatDuration(c.cooldownLeft) })}`}
                        </span>
                    ))}
                    {pools.map((p) => (
                        <span key={p.key}>
                            {p.label} {p.left}/{p.max}
                        </span>
                    ))}
                </div>
            )}
            {heroPanels?.map((Panel, i) => <Panel key={i} hero={hero} />)}
            {ConditionTestPanel && <ConditionTestPanel hero={hero} />}
        </section>
    );
}
