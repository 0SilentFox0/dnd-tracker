import { useTranslations } from 'next-intl';

import { fateLeftOf } from '../../rules/combat/fate';
import { editionOf } from '../../rules/edition/read';
import type { BlessingDimension } from '../../rules/magic/constants';
import type { CritBonus } from '../../rules/percentile/fortune';
import { wfrpState } from '../../rules/state';
import { D100RollPicker } from './D100RollPicker';
import { castChoices, fortuneControls } from './fortune-controls';

import { HudButton } from '@/components/hud';
import type { CastTestProps } from '@/components/systems/types';
import { cn } from '@/lib/utils';

const CRIT_BONUSES = [
    'criticalDamage',
    'totalPower',
    'unstoppableForce',
] as const;

const BLESSINGS = ['rangeYards', 'targets', 'durationRounds'] as const;

const chip = (on: boolean) =>
    cn(
        'flex-1 border-l border-white/20 text-sm first:border-l-0',
        on ? 'bg-white/10 font-bold text-[var(--ink)]' : 'text-hud-soft'
    );

export function CastTestBody({
    book: { state, view, actions },
}: CastTestProps) {
    const t = useTranslations('wfrpMagic.ui.cast');

    const { cast, caster } = view;

    const left = (caster && wfrpState(caster).fortune) ?? 0;

    const fateLeft = caster ? fateLeftOf(caster) : 0;

    if (!cast) return null;

    const canon = editionOf(view.rules).magicModel === 'canon5e';

    const choices = castChoices(state.castSystem, (slot) =>
        actions.setCastSystem(slot ?? null)
    );

    const kind = view.selected?.casting?.magic?.kind;

    const options = !canon
        ? []
        : [
              {
                  label: t('critBonus'),
                  list: CRIT_BONUSES as readonly string[],
                  value: choices.critBonus ?? 'totalPower',
                  pick: (v: string) =>
                      choices.set({
                          critBonus: v as CritBonus,
                          blessing: choices.blessing,
                      }),
                  name: (v: string) => t(`critBonuses.${v as CritBonus}`),
                  show: kind !== 'petty',
              },
              {
                  label: t('blessing'),
                  list: BLESSINGS as readonly string[],
                  value: choices.blessing ?? 'rangeYards',
                  pick: (v: string) =>
                      choices.set({
                          blessing: v as BlessingDimension,
                          critBonus: choices.critBonus,
                      }),
                  name: (v: string) => t(`blessings.${v as BlessingDimension}`),
                  show: kind === 'blessing',
              },
          ];

    const rolled = state.castServer
        ? t('rolledAuto')
        : state.castRoll === undefined
          ? null
          : state.castSecond === undefined
            ? t('rolled', { roll: state.castRoll })
            : t('rolledReroll', {
                  roll: state.castRoll,
                  second: state.castSecond,
              });

    return (
        <div className="mt-2">
            <div className="text-sm text-hud-gold">
                {t('line', {
                    cn: cast.cn,
                    target: cast.target,
                    channelled: cast.channelled,
                    armour: cast.armourSl,
                })}
            </div>
            <D100RollPicker
                fortune={{
                    available: left >= 1 || fateLeft >= 1,
                    left,
                    fateLeft,
                    ...fortuneControls(state.castSystem, view.rules, (slot) =>
                        actions.setCastSystem(slot ?? null)
                    ),
                }}
                onRoll={actions.setCastRoll}
                onAuto={() => actions.setCastRoll()}
            />
            {options
                .filter((o) => o.show)
                .map((o) => (
                    <div
                        key={o.label}
                        role="group"
                        aria-label={o.label}
                        className="mt-2 flex h-9 border border-white/20"
                    >
                        {o.list.map((v) => (
                            <HudButton
                                key={v}
                                type="button"
                                aria-pressed={o.value === v}
                                onClick={() => o.pick(v)}
                                className={chip(o.value === v)}
                            >
                                {o.name(v)}
                            </HudButton>
                        ))}
                    </div>
                ))}
            {rolled && (
                <div role="status" className="mt-2 text-sm text-[var(--ink)]">
                    {rolled}
                </div>
            )}
        </div>
    );
}
