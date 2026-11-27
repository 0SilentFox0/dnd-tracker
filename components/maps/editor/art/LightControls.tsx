'use client';

import { useTranslations } from 'next-intl';

import { HudToggleChip } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { LIGHT_COLORS } from '@/lib/constants/map-art/lights';
import type { useMapArtEditor } from '@/lib/hooks/battle-maps';
import { UNIT } from '@/lib/utils/battle/grid/layout';

type Art = ReturnType<typeof useMapArtEditor>;

export function LightControls({ art }: { art: Art }) {
    const t = useTranslations('maps.editor.art');

    const { lights, scene } = art;

    const light = scene?.lights.find((l) => l.id === lights.selectedId);

    if (!light)
        return <p className="text-xs text-hud-muted">{t('noLightSelected')}</p>;

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <Label htmlFor="art-light-radius" className="text-xs">
                    {t('lightRadius', {
                        value: Math.round((light.radius / UNIT) * 2) / 2,
                    })}
                </Label>
                <Slider
                    id="art-light-radius"
                    min={1}
                    max={30}
                    step={0.5}
                    value={light.radius / UNIT}
                    onValueChange={(cells) =>
                        lights.update(light.id, { radius: cells * UNIT })
                    }
                />
            </div>
            <div className="space-y-1">
                <Label className="text-xs">{t('lightColor')}</Label>
                <div className="flex flex-wrap gap-1.5">
                    {LIGHT_COLORS.map(({ id, color }) => (
                        <HudToggleChip
                            key={id}
                            active={light.color === color}
                            onClick={() => lights.update(light.id, { color })}
                        >
                            <span
                                aria-hidden="true"
                                className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                                style={{ backgroundColor: color }}
                            />
                            {t(`lightColors.${id}`)}
                        </HudToggleChip>
                    ))}
                </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="art-light-intensity" className="text-xs">
                    {t('lightIntensity', {
                        value: Math.round(light.intensity * 100),
                    })}
                </Label>
                <Slider
                    id="art-light-intensity"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={light.intensity}
                    onValueChange={(intensity) =>
                        lights.update(light.id, { intensity })
                    }
                />
            </div>
            <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => lights.remove(light.id)}
            >
                {t('lightRemove')}
            </Button>
        </div>
    );
}
