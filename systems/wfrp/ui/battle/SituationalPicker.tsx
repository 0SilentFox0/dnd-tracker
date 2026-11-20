'use client';

import { useTranslations } from 'next-intl';

import { SPOTS } from '../../rules/combat/constants';
import type { SituationalControls } from './fortune-controls';

import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';

const chip = (on: boolean) =>
    cn(
        'min-h-9 border border-white/20 px-2 text-sm',
        on ? 'bg-white/10 font-bold text-[var(--ink)]' : 'text-hud-soft'
    );

export function SituationalPicker({
    calledShot,
    situational,
    set,
}: SituationalControls) {
    const t = useTranslations('battleWfrp.ui.situational');

    const tl = useTranslations('battleWfrp.ui.fortune.locations');

    const put = (next: SituationalControls['situational']) =>
        set({ calledShot, situational: next });

    const { highGround, enclosed, badFooting } = situational;

    return (
        <div className="mt-3 space-y-1" data-testid="situational-picker">
            <div className="text-sm text-[var(--hud-muted)]">{t('title')}</div>
            <div
                role="group"
                aria-label={t('calledShot')}
                className="flex flex-wrap"
            >
                <HudButton
                    type="button"
                    aria-pressed={!calledShot}
                    className={chip(!calledShot)}
                    onClick={() => set({ situational })}
                >
                    {t('noCalledShot')}
                </HudButton>
                {SPOTS.map((spot) => (
                    <HudButton
                        key={spot}
                        type="button"
                        aria-pressed={calledShot === spot}
                        className={chip(calledShot === spot)}
                        onClick={() => set({ calledShot: spot, situational })}
                    >
                        {tl(spot)}
                    </HudButton>
                ))}
            </div>
            <div
                role="group"
                aria-label={t('flags')}
                className="flex flex-wrap"
            >
                <HudButton
                    type="button"
                    aria-pressed={highGround === 'attacker'}
                    className={chip(highGround === 'attacker')}
                    onClick={() =>
                        put({
                            ...situational,
                            highGround:
                                highGround === 'attacker'
                                    ? undefined
                                    : 'attacker',
                        })
                    }
                >
                    {t('attackerHigh')}
                </HudButton>
                <HudButton
                    type="button"
                    aria-pressed={highGround === 'defender'}
                    className={chip(highGround === 'defender')}
                    onClick={() =>
                        put({
                            ...situational,
                            highGround:
                                highGround === 'defender'
                                    ? undefined
                                    : 'defender',
                        })
                    }
                >
                    {t('defenderHigh')}
                </HudButton>
                <HudButton
                    type="button"
                    aria-pressed={!!enclosed}
                    className={chip(!!enclosed)}
                    onClick={() =>
                        put({
                            ...situational,
                            enclosed: enclosed ? undefined : true,
                        })
                    }
                >
                    {t('enclosed')}
                </HudButton>
                <HudButton
                    type="button"
                    aria-pressed={!!badFooting}
                    className={chip(!!badFooting)}
                    onClick={() =>
                        put({
                            ...situational,
                            badFooting: badFooting ? undefined : true,
                        })
                    }
                >
                    {t('badFooting')}
                </HudButton>
            </div>
        </div>
    );
}
