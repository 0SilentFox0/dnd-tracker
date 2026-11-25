'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';

import { type MapPlacement, routeFrames, tokenBoxStyle } from './token-box';

import { Button } from '@/components/ui/button';
import {
    useDamageShake,
    useFxEnabled,
    useHitChange,
    useTokenGlide,
} from '@/lib/hooks/battle';
import { useText } from '@/lib/i18n/use-text';
import { cn } from '@/lib/utils';
import { type FxImpact, hudMotifsOf } from '@/lib/utils/battle/fx';
import { isFallen } from '@/lib/utils/battle/grid';
import { isDown } from '@/lib/utils/battle/participant/state';
import {
    HEALTH_LABEL,
    healthSegments,
    healthState,
    hpRatio,
    hpTone,
    NO_EFFECTS,
} from '@/lib/utils/battle/view';
import { clamp } from '@/lib/utils/common/clamp';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export interface MapTokenHudProps {
    participant: BattleParticipant;
    placement: MapPlacement;
    exact: boolean;
    raised: boolean;
    impact?: FxImpact | null;
    effects?: readonly ActiveEffect[];
    onReturn?: () => void;
}

const MIN_LINE_BOX_PX = 20;

function hpView(
    participant: BattleParticipant,
    exact: boolean
): { ratio: number; text: LogLine } {
    const { currentHp, maxHp } = participant.combatStats;

    if (exact) {
        const ratio = hpRatio(participant);

        return { ratio, text: `${currentHp}/${maxHp}` };
    }

    const state = healthState(participant);

    return { ratio: healthSegments(state) / 4, text: HEALTH_LABEL[state] };
}

function MapTokenHudImpl({
    participant: live,
    placement,
    exact,
    raised,
    impact = null,
    effects = NO_EFFECTS,
    onReturn,
}: MapTokenHudProps) {
    const { box, mapSize, pxPerUnit, hovered } = placement;

    const glideRef = useTokenGlide<HTMLDivElement>(
        routeFrames(placement.route, placement)
    );

    const t = useTranslations('battle.map');

    const fmt = useText();

    const { change, shown: participant } = useHitChange(live, impact);

    const shake = useDamageShake<HTMLDivElement>(change);

    const { userEnabled, motionAllowed } = useFxEnabled();

    const motifs = userEnabled ? hudMotifsOf(effects) : [];

    const down = isDown(participant);

    if (isFallen(participant)) return null;

    const boxPx = box.size * pxPerUnit;

    const showLine = boxPx >= MIN_LINE_BOX_PX;

    if (!showLine && !onReturn) return null;

    const barPx = clamp(Math.round(boxPx * 0.07), 2, 5);

    const labelFont = clamp(boxPx * 0.12, 8, 12);

    const { ratio, text: hpText } = hpView(participant, exact);

    const width = `${ratio * 100}%`;

    return (
        <div
            ref={glideRef}
            data-map-hud={participant.basicInfo.id}
            className="pointer-events-none absolute"
            style={{
                ...tokenBoxStyle(box, mapSize),
                zIndex: hovered ? 30 : raised ? 20 : 10,
            }}
        >
            {onReturn && (
                <Button
                    type="button"
                    variant="outline"
                    data-map-return
                    className="hud-sc pointer-events-auto absolute top-0 left-1/2 z-10 h-auto -translate-x-1/2 rounded-md border-white/20 bg-black/80 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-[var(--ink)] shadow-none hover:bg-black hover:text-[var(--ink)]"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onReturn();
                    }}
                >
                    {t('returnToToken')}
                </Button>
            )}
            {showLine && (
                <div
                    ref={shake}
                    data-map-hud-strip
                    data-hud-rim={motifs[0]}
                    className={cn(
                        'map-hud-plaque absolute bottom-0 left-[15%] w-[70%]',
                        motionAllowed && 'map-hud-anim',
                        down && 'opacity-40'
                    )}
                >
                    {motifs.map((m) => (
                        <i
                            key={m}
                            aria-hidden
                            data-hud-fx={m}
                            className="map-hud-fx"
                        />
                    ))}
                    <div
                        data-map-hud-bar
                        data-hp-tone={down ? 'down' : hpTone(ratio)}
                        className="map-hud-bar relative"
                        style={{ height: barPx }}
                    >
                        <i
                            data-map-hud-trail
                            className="map-hud-trail"
                            style={{ width }}
                        />
                        <i
                            data-map-hud-fill
                            className="map-hud-fill"
                            style={{ width }}
                        />
                    </div>
                    {hovered && (
                        <div
                            data-map-hud-tip
                            className={cn(
                                'map-hud-tip hud-sc absolute top-full left-1/2 mt-1 -translate-x-1/2 text-center leading-tight font-bold whitespace-nowrap',
                                down && 'line-through'
                            )}
                            style={{ fontSize: labelFont }}
                        >
                            <span data-map-hud-name>
                                {participant.basicInfo.name}
                            </span>{' '}
                            <span
                                data-map-hud-value
                                className={cn(
                                    exact ? 'font-sans font-semibold' : 'italic'
                                )}
                            >
                                {fmt(hpText)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const MapTokenHud = memo(MapTokenHudImpl);
