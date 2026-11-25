'use client';

import { type PointerEvent, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Slider } from '@/components/ui/slider';
import { type BattleMapEditor, useGridCalibration } from '@/lib/hooks/battles';
import {
    backgroundColsOf,
    backgroundRowsOf,
    type NudgeUnit,
} from '@/lib/utils/battle/grid';
import { toMediaUrl } from '@/lib/utils/common/image-url';

const MAX_N = 20;

const STEPS: { unit: NudgeUnit; step: number }[] = [
    { unit: 'px', step: 1 },
    { unit: 'cell', step: 0.01 },
];

const DIRECTIONS = [
    { key: 'left', Icon: ArrowLeft, dx: -1, dy: 0 },
    { key: 'right', Icon: ArrowRight, dx: 1, dy: 0 },
    { key: 'up', Icon: ArrowUp, dx: 0, dy: -1 },
    { key: 'down', Icon: ArrowDown, dx: 0, dy: 1 },
] as const;

export function GridCalibration({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map.calibration');

    const { map, imageSrc } = editor.state;

    const { state, actions } = useGridCalibration(editor);

    const [zoom, setZoom] = useState(1);

    const { image, mode, draft, preview } = state;

    const grid = image
        ? (preview ?? {
              backgroundCols: backgroundColsOf(map, image),
              backgroundRows: backgroundRowsOf(map, image),
              gridOffset: map.gridOffset ?? { x: 0, y: 0 },
          })
        : null;

    const toImagePoint = (e: PointerEvent<HTMLDivElement>) => {
        const box = e.currentTarget.getBoundingClientRect();

        return {
            x: ((e.clientX - box.left) / box.width) * (image?.width ?? 0),
            y: ((e.clientY - box.top) / box.height) * (image?.height ?? 0),
        };
    };

    const onDown = (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        actions.press(toImagePoint(e));
    };

    const onMove = (e: PointerEvent<HTMLDivElement>) => {
        if (e.buttons) actions.drag(toImagePoint(e));
    };

    const dialogOpen = mode === 'rect' && !!image && !!grid;

    return (
        <div className="space-y-2">
            <OnboardingHint id="dm.grid-calibration" />
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>{t('title')}</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!image || mode !== 'off'}
                    onClick={actions.start}
                >
                    {t('start')}
                </Button>
            </div>
            {dialogOpen && (
                <ResponsiveDialog
                    open
                    onOpenChange={(open) => !open && actions.cancel()}
                    title={t('title')}
                    description={t('instructions')}
                    className="max-w-5xl"
                    footer={
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={actions.cancel}
                            >
                                {t('cancel')}
                            </Button>
                            <Button
                                type="button"
                                disabled={!preview}
                                onClick={actions.commit}
                            >
                                {t('apply')}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-3 overflow-y-auto px-4 pb-2 sm:px-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Label
                                htmlFor="map-calibration-n"
                                className="text-xs"
                            >
                                {t('squareN')}
                            </Label>
                            <BoundedNumberInput
                                id="map-calibration-n"
                                className="w-16"
                                value={state.n}
                                min={1}
                                max={MAX_N}
                                onCommit={actions.setN}
                            />
                        </div>
                        <div className="max-h-[68dvh] overflow-auto rounded-md p-2">
                            <div
                                data-testid="calibration-surface"
                                className="relative mx-auto shrink-0 touch-none overflow-hidden rounded-md border border-hud-rule select-none"
                                style={{
                                    aspectRatio: `${image.width} / ${image.height}`,
                                    width: `calc(min(100%, 62dvh * ${image.width / image.height}) * ${zoom})`,
                                }}
                                onPointerDown={onDown}
                                onPointerMove={onMove}
                            >
                                <Image
                                    src={toMediaUrl(imageSrc)}
                                    alt=""
                                    fill
                                    sizes="(min-width: 1024px) 64rem, 100vw"
                                    className="pointer-events-none object-fill"
                                />
                                <svg
                                    viewBox={`0 0 ${image.width} ${image.height}`}
                                    preserveAspectRatio="none"
                                    className="pointer-events-none absolute inset-0 h-full w-full"
                                    style={{ opacity: state.previewOpacity }}
                                    aria-hidden
                                >
                                    <defs>
                                        <pattern
                                            id="calibration-grid"
                                            patternUnits="userSpaceOnUse"
                                            width={
                                                image.width /
                                                grid.backgroundCols
                                            }
                                            height={
                                                image.height /
                                                grid.backgroundRows
                                            }
                                            x={
                                                (grid.gridOffset.x *
                                                    image.width) /
                                                grid.backgroundCols
                                            }
                                            y={
                                                (grid.gridOffset.y *
                                                    image.height) /
                                                grid.backgroundRows
                                            }
                                        >
                                            <path
                                                d={`M ${image.width / grid.backgroundCols} 0 V ${image.height / grid.backgroundRows} H 0`}
                                                fill="none"
                                                stroke="var(--hud-gold, #f2c14e)"
                                                strokeWidth={1}
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        </pattern>
                                    </defs>
                                    <rect
                                        width={image.width}
                                        height={image.height}
                                        fill="url(#calibration-grid)"
                                    />
                                </svg>
                                {draft && (
                                    <div
                                        data-testid="calibration-draft"
                                        className="pointer-events-none absolute border-2 border-hud-gold-bright bg-hud-panel-2"
                                        style={{
                                            left: `${(draft.x / image.width) * 100}%`,
                                            top: `${(draft.y / image.height) * 100}%`,
                                            width: `${(draft.w / image.width) * 100}%`,
                                            height: `${(draft.h / image.height) * 100}%`,
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="map-calibration-zoom">
                                {t('zoom', { value: zoom })}
                            </Label>
                            <Slider
                                id="map-calibration-zoom"
                                min={1}
                                max={4}
                                step={0.25}
                                value={zoom}
                                onValueChange={(v) => setZoom(v)}
                                className="w-full accent-[var(--hud-gold,#f2c14e)]"
                            />
                        </div>
                        <div>
                            <Label htmlFor="map-calibration-opacity">
                                {t('previewOpacity')}
                            </Label>
                            <Slider
                                id="map-calibration-opacity"
                                min={0.1}
                                max={1}
                                step={0.05}
                                value={state.previewOpacity}
                                onValueChange={(v) =>
                                    actions.setPreviewOpacity(v)
                                }
                                className="w-full accent-[var(--hud-gold,#f2c14e)]"
                            />
                        </div>
                    </div>
                </ResponsiveDialog>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-2">
                {STEPS.map(({ unit, step }) => (
                    <div key={unit} className="space-y-1">
                        <span className="text-xs text-hud-muted">
                            {t(unit === 'px' ? 'nudgePx' : 'nudgeCell')}
                        </span>
                        <div className="flex gap-1">
                            {DIRECTIONS.map(({ key, Icon, dx, dy }) => (
                                <Button
                                    key={key}
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    disabled={!state.canNudge}
                                    aria-label={`${t(unit === 'px' ? 'nudgePx' : 'nudgeCell')}: ${t(key)}`}
                                    onClick={() =>
                                        actions.nudge(
                                            dx * step,
                                            dy * step,
                                            unit
                                        )
                                    }
                                >
                                    <Icon className="size-4" />
                                </Button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
