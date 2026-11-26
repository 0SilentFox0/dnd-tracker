'use client';

import { useTranslations } from 'next-intl';

import { HudToggleChip } from '@/components/hud';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AMBIENT_TINTS } from '@/lib/constants/map-art/lights';
import type { useMapArtEditor } from '@/lib/hooks/battle-maps';

type Art = ReturnType<typeof useMapArtEditor>;

export function AmbientControls({ art }: { art: Art }) {
    const t = useTranslations('maps.editor.art');

    const ambient = art.scene?.ambient;

    if (!ambient) return null;

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <Label className="text-xs">{t('ambientTint')}</Label>
                <div className="flex flex-wrap gap-1.5">
                    {AMBIENT_TINTS.map(({ id, color }) => (
                        <HudToggleChip
                            key={id}
                            tall
                            active={ambient.tint === color}
                            onClick={() => art.setAmbient({ tint: color })}
                        >
                            {t(`tints.${id}`)}
                        </HudToggleChip>
                    ))}
                </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="art-darkness" className="text-xs">
                    {t('darkness', {
                        value: Math.round(ambient.darkness * 100),
                    })}
                </Label>
                <Slider
                    id="art-darkness"
                    min={0}
                    max={0.9}
                    step={0.05}
                    value={ambient.darkness}
                    onValueChange={(darkness) => art.setAmbient({ darkness })}
                />
            </div>
        </div>
    );
}
