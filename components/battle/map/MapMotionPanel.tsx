'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { HudToggleChip } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    MAP_MOTION_MAX_SPEED,
    MAP_MOTION_PRESETS,
} from '@/lib/constants/battle-motion';
import type { MapMotionTool } from '@/lib/hooks/battle';
import { useReducedMotion } from '@/lib/hooks/common';

const SLIDER_DEBOUNCE_MS = 250;

const PRESET_KEYS = ['slow', 'medium', 'fast', 'veryFast'] as const;

const ACTION = 'h-7 bg-black/60 px-2 text-xs text-hud-muted hover:text-hud-bone';

export function MapMotionPanel({ tool }: { tool: MapMotionTool }) {
    const t = useTranslations('battle.map');

    const reduced = useReducedMotion();

    const { current, pending } = tool;

    const sign = current && current.speed < 0 ? -1 : 1;

    const magnitude = current ? Math.abs(current.speed) : 0;

    const [local, setLocal] = useState(magnitude);

    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const [synced, setSynced] = useState(magnitude);

    if (synced !== magnitude) {
        setSynced(magnitude);
        setLocal(magnitude);
    }

    useEffect(() => () => clearTimeout(timer.current), []);

    const slide = (value: number) => {
        setLocal(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(
            () => tool.setSpeed(sign * value),
            SLIDER_DEBOUNCE_MS
        );
    };

    const off = !current;

    return (
        <div
            role="group"
            aria-label={t('tools.motion')}
            className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs text-hud-bone"
        >
            {(['x', 'y'] as const).map((axis) => (
                <HudToggleChip
                    key={axis}
                    active={current?.axis === axis}
                    disabled={pending}
                    onClick={() => tool.setAxis(axis)}
                >
                    {t(axis === 'x' ? 'motion.axisX' : 'motion.axisY')}
                </HudToggleChip>
            ))}
            <Button
                variant="outline"
                disabled={pending || off || current.speed === 0}
                onClick={tool.reverse}
                className={ACTION}
            >
                {t('motion.reverse')}
            </Button>
            {PRESET_KEYS.map((key) => (
                <HudToggleChip
                    key={key}
                    active={magnitude === MAP_MOTION_PRESETS[key]}
                    disabled={pending || off}
                    onClick={() =>
                        tool.setSpeed(sign * MAP_MOTION_PRESETS[key])
                    }
                >
                    {t(`motion.${key}`)}
                </HudToggleChip>
            ))}
            <Slider
                aria-label={t('motion.speed')}
                min={0}
                max={MAP_MOTION_MAX_SPEED}
                step={0.1}
                value={local}
                disabled={pending || off}
                onValueChange={slide}
                className="w-24"
            />
            <Button
                variant="outline"
                disabled={pending || off}
                onClick={tool.togglePaused}
                className={ACTION}
            >
                {t(current?.speed === 0 ? 'motion.resume' : 'motion.pause')}
            </Button>
            <Button
                variant="outline"
                disabled={pending || off}
                onClick={tool.turnOff}
                className={ACTION}
            >
                {t('motion.off')}
            </Button>
            {reduced && (
                <p className="basis-full text-hud-muted">
                    {t('motion.reducedHint')}
                </p>
            )}
        </div>
    );
}
