'use client';

import { useTranslations } from 'next-intl';

import { MapBackgroundSection } from '../map/MapBackgroundSection';
import { MapCellToolsSection } from '../map/MapCellToolsSection';
import {
    DoorToolOptions,
    EDGE_TOOLS,
    ToolButtons,
} from '../map/MapToolButtons';
import { ToggleRow } from './ToggleRow';

import { BattleMap } from '@/components/battle/map';
import { MapMotionPanel } from '@/components/battle/map/panels/MapMotionPanel';
import { MAP_MODE_UI, type MapModeUi } from '@/components/battle/modes';
import { HudSection } from '@/components/hud/form';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { BattleMapEditor } from '@/lib/hooks/battles';
import { useCoarsePointer } from '@/lib/hooks/common';
import { useText } from '@/lib/i18n/use-text';
import {
    isEdgeTool,
    isPreviewSafeBackground,
    marginLimit,
    type Margins,
    MAX_MARGIN,
    MAX_SIDE,
    MIN_PLAYABLE,
    MIN_SIDE,
} from '@/lib/utils/battle/grid';
import type { MapModeKey } from '@/lib/utils/battle/modes';
import { clamp } from '@/lib/utils/common/clamp';

const MARGIN_KEYS: (keyof Margins)[] = ['top', 'right', 'bottom', 'left'];

const FULL_HEIGHT = { className: 'h-full' };

export function BattleFormMap({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    const text = useText();

    const touch = useCoarsePointer();

    const { enabled, map, mode, margins, tool, notice } = editor.state;

    const { actions } = editor;

    const cellTool = tool !== null && !isEdgeTool(tool);

    const previewMap =
        isPreviewSafeBackground(map.background) || map.background === null
            ? map
            : { ...map, background: null };

    const setEqual = () => {
        const cap = Math.min(
            MAX_MARGIN,
            Math.floor((map.rows - MIN_PLAYABLE) / 2),
            Math.floor((map.cols - MIN_PLAYABLE) / 2)
        );

        const n = clamp(margins.top, 0, cap);

        actions.setMargins({ top: n, right: n, bottom: n, left: n });
    };

    const modeToggles = (
        Object.entries(MAP_MODE_UI) as [MapModeKey, MapModeUi][]
    ).map(
        ([key, { SetupToggle }]) =>
            SetupToggle && (
                <SetupToggle
                    key={key}
                    checked={mode === key}
                    onChange={(on) => actions.setMode(key, on)}
                />
            )
    );

    return (
        <HudSection title={t('title')} className="space-y-4">
            <ToggleRow
                id="map-enabled"
                label={t('enabled')}
                checked={enabled}
                onChange={actions.setEnabled}
            />
            {enabled && modeToggles}
            {enabled && (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="map-cols">{t('cols')}</Label>
                                <BoundedNumberInput
                                    id="map-cols"
                                    value={map.cols}
                                    min={MIN_SIDE}
                                    max={MAX_SIDE}
                                    onCommit={(v) =>
                                        actions.setSize(v, map.rows)
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="map-rows">{t('rows')}</Label>
                                <BoundedNumberInput
                                    id="map-rows"
                                    value={map.rows}
                                    min={MIN_SIDE}
                                    max={MAX_SIDE}
                                    onCommit={(v) =>
                                        actions.setSize(map.cols, v)
                                    }
                                />
                            </div>
                        </div>
                        <MapBackgroundSection editor={editor} />
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label>{t('margins.title')}</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={setEqual}
                                >
                                    {t('margins.equal')}
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {MARGIN_KEYS.map((key) => (
                                    <div key={key}>
                                        <Label
                                            htmlFor={`map-margin-${key}`}
                                            className="text-xs"
                                        >
                                            {t(`margins.${key}`)}
                                        </Label>
                                        <BoundedNumberInput
                                            id={`map-margin-${key}`}
                                            value={margins[key]}
                                            min={0}
                                            max={marginLimit(map, margins, key)}
                                            onCommit={(v) =>
                                                actions.setMargins({
                                                    ...margins,
                                                    [key]: v,
                                                })
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <MapCellToolsSection editor={editor} />
                        {mode && MAP_MODE_UI[mode].hidesTerrain && (
                            <p className="text-sm text-hud-muted">
                                {t('edgesDisabledMode')}
                            </p>
                        )}
                        {!(mode && MAP_MODE_UI[mode].hidesTerrain) &&
                            (touch ? (
                                <p className="text-sm text-hud-muted">
                                    {t('edgesDesktopOnly')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <OnboardingHint id="dm.map-walls" />
                                    <Label>{t('edgeDrawing')}</Label>
                                    <ToolButtons
                                        tools={EDGE_TOOLS}
                                        tool={tool}
                                        onPick={actions.setTool}
                                    />
                                    <DoorToolOptions editor={editor} />
                                </div>
                            ))}
                        {editor.motionTool && (
                            <div className="space-y-2">
                                <Label>{t('motion')}</Label>
                                <MapMotionPanel tool={editor.motionTool} />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 space-y-2">
                        <p
                            aria-live="polite"
                            role="status"
                            className="min-h-5 text-sm text-hud-gold-bright"
                        >
                            {notice && text(notice)}
                        </p>
                        <div className="h-[55vh] lg:h-[60vh]">
                            <BattleMap
                                map={previewMap}
                                participants={[]}
                                actions={{ onStroke: actions.onStroke }}
                                look={FULL_HEIGHT}
                                editing={{
                                    clickableBlocked: cellTool,
                                    strokeTool: cellTool,
                                    showBlocked: true,
                                    edges: editor.edgeEditing,
                                    doorLocks: true,
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </HudSection>
    );
}
