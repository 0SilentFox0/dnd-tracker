'use client';

import { useTranslations } from 'next-intl';

import { HudToggleChip } from '@/components/hud';
import { Label } from '@/components/ui/label';
import { OPENING_MATERIALS } from '@/lib/constants/map-art/materials';
import type { useMapArtEditor } from '@/lib/hooks/battle-maps';

type Materials = ReturnType<typeof useMapArtEditor>['materials'];

export function OpeningOptions({ materials }: { materials: Materials }) {
    const t = useTranslations('maps.editor.art');

    const { opening } = materials;

    return (
        <div className="space-y-2">
            <Label className="text-xs">{t('openingMaterial')}</Label>
            <div className="flex flex-wrap gap-1.5">
                {OPENING_MATERIALS.map(({ id, kind }) => (
                    <HudToggleChip
                        key={id}
                        tall
                        active={opening.material === id && opening.kind === kind}
                        onClick={() =>
                            materials.set({ opening: { kind, material: id } })
                        }
                    >
                        {t(`openingMaterials.${id}` as never)}
                    </HudToggleChip>
                ))}
            </div>
            {opening.kind === 'door' && (
                <HudToggleChip
                    tall
                    active={opening.locked}
                    onClick={() =>
                        materials.set({ opening: { locked: !opening.locked } })
                    }
                >
                    {t('locked')}
                </HudToggleChip>
            )}
        </div>
    );
}
