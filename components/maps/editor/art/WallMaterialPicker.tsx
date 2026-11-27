'use client';

import { useTranslations } from 'next-intl';

import { HudToggleChip } from '@/components/hud';
import { WALL_MATERIALS } from '@/lib/constants/map-art/materials';

export function WallMaterialPicker({
    selected,
    onSelect,
}: {
    selected: string;
    onSelect: (id: string) => void;
}) {
    const t = useTranslations('maps.editor.art.wallMaterial');

    return (
        <div className="flex flex-wrap gap-1.5">
            {WALL_MATERIALS.map(({ id }) => (
                <HudToggleChip
                    key={id}
                    active={selected === id}
                    onClick={() => onSelect(id)}
                >
                    {t(id as never)}
                </HudToggleChip>
            ))}
        </div>
    );
}
