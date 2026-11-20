import { useTranslations } from 'next-intl';

import { OVERCAST_DIRECTIONS } from '../../rules/magic/constants';
import { overcastCap, overcastDirections } from '../../rules/magic/overcast';
import type { CastChoices } from './fortune-controls';

import { HudButton } from '@/components/hud';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';
import type { BookSpell } from '@/types/spells';

export function OvercastPlanPicker({
    caster,
    spell,
    choices,
}: {
    caster: BattleParticipant;
    spell: BookSpell;
    choices: CastChoices;
}) {
    const t = useTranslations('wfrpMagic.ui.cast');

    const magic = spell.casting?.magic as SpellMagic | undefined;

    if (!magic || !spell.targeting) return null;

    const allowed = overcastDirections(
        magic,
        spell.targeting,
        spell.spellEffects ?? []
    );

    if (allowed.length === 0) return null;

    const cap = overcastCap(caster);

    const plan = choices.overcast ?? {};

    const spent = Object.values(plan).reduce((a, b) => a + b, 0);

    const step = (dir: (typeof OVERCAST_DIRECTIONS)[number], by: number) => {
        const next = { ...plan, [dir]: Math.max(0, (plan[dir] ?? 0) + by) };

        if (!next[dir]) delete next[dir];

        choices.set({
            critBonus: choices.critBonus,
            blessing: choices.blessing,
            overcast: Object.keys(next).length ? next : undefined,
        });
    };

    return (
        <div className="mt-2 text-sm" role="group" aria-label={t('overcastPlan', { cap })}>
            <div className="text-hud-gold">
                {t('overcastPlan', { cap })} · {t('overcastSpend', { spent, cap })}
            </div>
            {OVERCAST_DIRECTIONS.filter((d) => allowed.includes(d)).map((d) => {
                const name = t(`overcastDirections.${d}`);

                return (
                    <div key={d} className="mt-1 flex items-center gap-2">
                        <span className="flex-1 text-hud-soft">{name}</span>
                        <HudButton
                            type="button"
                            aria-label={t('overcastLess', { direction: name })}
                            disabled={!plan[d]}
                            onClick={() => step(d, -1)}
                        >
                            −
                        </HudButton>
                        <span className="w-6 text-center">{plan[d] ?? 0}</span>
                        <HudButton
                            type="button"
                            aria-label={t('overcastMore', { direction: name })}
                            disabled={spent >= cap}
                            onClick={() => step(d, 1)}
                        >
                            +
                        </HudButton>
                    </div>
                );
            })}
            <div className="mt-1 text-xs text-hud-soft">{t('overcastNote')}</div>
        </div>
    );
}
