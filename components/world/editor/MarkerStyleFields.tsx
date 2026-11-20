'use client';

import { useTranslations } from 'next-intl';

import { FieldRow } from './FieldRow';
import { MarkerColorField } from './MarkerColorField';

import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { Slider } from '@/components/ui/slider';
import {
    WORLD_ZONE_OPACITY_MIN,
    ZONE_FILL_DEFAULT,
    ZONE_LABEL_MODES,
} from '@/lib/constants/world';
import type { useMarkerFields } from '@/lib/hooks/world';
import type { WorldMarker, WorldViewLayer, ZoneLabelMode } from '@/types/world';

const OPACITY_STEP = 0.05;

interface MarkerStyleFieldsProps {
    marker: WorldMarker;
    layer?: Pick<WorldViewLayer, 'color' | 'icon' | 'zoneOpacity'> | null;
    form: ReturnType<typeof useMarkerFields>;
}

export function MarkerStyleFields({
    marker,
    layer,
    form,
}: MarkerStyleFieldsProps) {
    const t = useTranslations('world');

    const ts = useTranslations('world.marker.style');

    const zone = marker.kind === 'zone';

    const colorInherited = form.color === null && !!layer?.color;

    const iconInherited = !zone && !marker.icon && !!layer?.icon;

    const opacity = form.fillOpacity ?? layer?.zoneOpacity ?? ZONE_FILL_DEFAULT;

    return (
        <div className="space-y-1.5">
            <FieldRow label={t(zone ? 'editor.zoneColor' : 'editor.pointColor')}>
                <MarkerColorField
                    label={t(zone ? 'editor.zoneColor' : 'editor.pointColor')}
                    color={form.color ?? layer?.color ?? form.colorValue}
                    isCustom={!layer && form.isCustomColor}
                    onPick={form.pickColor}
                    onReset={form.resetColor}
                />
                {colorInherited ? (
                    <span className="text-hud-muted">{ts('inherited')}</span>
                ) : null}
                {layer && form.color ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={form.resetColor}
                    >
                        {ts('inherit')}
                    </Button>
                ) : null}
            </FieldRow>
            {!zone && layer && (iconInherited || marker.icon) ? (
                <FieldRow label={t('editor.icon')}>
                    {iconInherited ? (
                        <span className="text-hud-muted">
                            {ts('inherited')}
                        </span>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void form.save({ icon: null })}
                        >
                            {ts('inherit')}
                        </Button>
                    )}
                </FieldRow>
            ) : null}
            {zone ? (
                <>
                    <FieldRow label={ts('labelMode.label')}>
                        <SelectField
                            aria-label={ts('labelMode.label')}
                            value={form.labelMode ?? ''}
                            onValueChange={(v) =>
                                void form.setLabelMode(
                                    (v || null) as ZoneLabelMode | null
                                )
                            }
                            allowNone
                            noneLabel={ts('labelMode.inherit')}
                            options={ZONE_LABEL_MODES.map((v) => ({
                                value: v,
                                label: ts(`labelMode.${v}`),
                            }))}
                        />
                    </FieldRow>
                    <FieldRow label={ts('opacity')}>
                        <Slider
                            aria-label={ts('opacity')}
                            className="min-w-0 flex-1"
                            value={opacity}
                            min={WORLD_ZONE_OPACITY_MIN}
                            max={1}
                            step={OPACITY_STEP}
                            onValueChange={form.changeFillOpacity}
                        />
                        {form.fillOpacity !== null ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="shrink-0"
                                onClick={() => form.changeFillOpacity(null)}
                            >
                                {ts('opacityReset')}
                            </Button>
                        ) : null}
                    </FieldRow>
                </>
            ) : null}
        </div>
    );
}
