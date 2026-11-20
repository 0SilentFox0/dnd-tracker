import { useTranslations } from 'next-intl';

import { OVERCAST_DIRECTIONS } from '../../rules/magic/constants';
import { overcastRowOf } from '../../rules/magic/overcast';

import { cn } from '@/lib/utils';
import type { PercentileCastDetails } from '@/systems/wfrp/rules/percentile/details';

const TONE = {
    critical: 'text-[#ffd36a]',
    success: 'text-[#8fd18f]',
    failure: 'text-[#8f8f96]',
    fumble: 'text-[#c0564a]',
} as const;

function extensionLines(
    cast: PercentileCastDetails,
    label: (dir: 'damage' | 'targets' | 'range' | 'aoe' | 'duration', n: number) => string
): string[] {
    const spent = cast.overcast;

    if (!spent) return [];

    return OVERCAST_DIRECTIONS.flatMap((dir) => {
        const sl = spent[dir];

        const row = sl ? overcastRowOf(sl) : undefined;

        const n = row
            ? {
                  damage: row.damage,
                  targets: row.targets,
                  range: row.rangeMul,
                  aoe: row.aoeMul,
                  duration: row.durationMul,
              }[dir]
            : 0;

        return n > (dir === 'range' || dir === 'aoe' || dir === 'duration' ? 1 : 0)
            ? [label(dir, n)]
            : [];
    });
}

export function CastResultLines({ cast }: { cast: PercentileCastDetails }) {
    const t = useTranslations('wfrpMagic.ui.result');

    const tf = useTranslations('battleWfrp.ui.fortune');

    const modifiers = [
        cast.channelled > 0 && t('channelled', { channelled: cast.channelled }),
        cast.armourSl > 0 && t('armour', { armour: cast.armourSl }),
    ].filter(Boolean);

    const overcast = extensionLines(cast, (dir, n) =>
        t(`overcastParts.${dir}`, { n })
    );

    return (
        <div className="mt-1 space-y-0.5 text-sm text-hud-soft">
            <div className={cn('hud-sc font-bold', TONE[cast.outcome])}>
                {t(`title.${cast.outcome}`)}
            </div>
            <div>
                {t('roll', {
                    roll: cast.roll,
                    target: cast.target,
                    sl: cast.sl,
                    cn: cast.cn,
                })}
            </div>
            {modifiers.length > 0 && <div>{modifiers.join(' · ')}</div>}
            {overcast.length > 0 ? (
                <div className="text-hud-gold">
                    {t('overcastSpent', { parts: overcast.join(', ') })}
                </div>
            ) : (
                cast.overcastSteps > 0 && (
                    <div className="text-hud-gold">
                        {t('overcast', { steps: cast.overcastSteps })}
                    </div>
                )
            )}
            {cast.miscast && (
                <div className="text-[#e9705a]">
                    {t(`miscast.${cast.miscast}`)}
                </div>
            )}
            {cast.fortune && (
                <div className="text-hud-gold">
                    {cast.fortune.kind === 'sl'
                        ? tf('usedSl')
                        : cast.fortune.kind === 'notFail'
                          ? tf('usedNotFail')
                          : cast.fortune.firstRoll !== undefined
                            ? tf('used', { first: cast.fortune.firstRoll })
                            : `${tf('label')}: ${tf('reroll')}`}
                </div>
            )}
        </div>
    );
}
