import { useTranslations } from 'next-intl';

import { fateLeftOf } from '../../rules/combat/fate';
import { wfrpState } from '../../rules/state';
import { D100RollPicker } from './D100RollPicker';
import { fortuneControls } from './fortune-controls';

import type { CastTestProps } from '@/components/systems/types';

export function CastTestBody({
    book: { state, view, actions },
}: CastTestProps) {
    const t = useTranslations('wfrpMagic.ui.cast');

    const { cast, caster } = view;

    const left = (caster && wfrpState(caster).fortune) ?? 0;

    const fateLeft = caster ? fateLeftOf(caster) : 0;

    if (!cast) return null;

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
            {rolled && (
                <div role="status" className="mt-2 text-sm text-[var(--ink)]">
                    {rolled}
                </div>
            )}
        </div>
    );
}
