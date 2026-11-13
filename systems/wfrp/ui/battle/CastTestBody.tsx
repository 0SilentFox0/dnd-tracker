import { useTranslations } from 'next-intl';

import { FORTUNE_INPUT } from '../../rules/percentile/fortune';
import { wfrpState } from '../../rules/state';
import { D100RollPicker } from './D100RollPicker';

import type { CastTestProps } from '@/components/systems/types';

export function CastTestBody({
    book: { state, view, actions },
}: CastTestProps) {
    const t = useTranslations('wfrpMagic.ui.cast');

    const { cast, caster } = view;

    const left = (caster && wfrpState(caster).fortune) ?? 0;

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
                    available: left >= 1,
                    left,
                    value: FORTUNE_INPUT.read(state.castSystem)?.kind ?? null,
                    onChange: (kind) =>
                        actions.setCastSystem(
                            kind && FORTUNE_INPUT.write({ kind })
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
