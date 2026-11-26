import type { BattleMapSaveInput } from '@/lib/schemas/battle-maps';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { bakedBackgroundSpan } from '@/lib/utils/battle/map-art/bake-size';
import { deriveMechanics } from '@/lib/utils/battle/map-art/derive';
import type { MapArtScene } from '@/types/battle-map';

export function composeArtSave(input: {
    save: BattleMapSaveInput;
    scene: MapArtScene;
    bakedUrl?: string;
}): BattleMapSaveInput {
    const { save, scene, bakedUrl } = input;

    const { walls, bars, doors, blocked } = deriveMechanics(
        scene,
        gridOf(save.map)
    );

    const { blocked: _blocked, ...rest } = save.map;

    const { gridOffset: _offset, ...noOffset } = rest;

    const map = {
        ...(bakedUrl ? noOffset : rest),
        doors,
        ...(blocked.length ? { blocked } : {}),
        ...(bakedUrl
            ? {
                  background: bakedUrl,
                  ...bakedBackgroundSpan(save.map),
                  artBaked: true as const,
              }
            : {}),
    };

    return { ...save, map, walls, bars };
}
