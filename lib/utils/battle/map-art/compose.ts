import type { BattleMapSaveInput } from '@/lib/schemas/battle-maps';
import { bakedBackgroundSpan } from '@/lib/utils/battle/map-art/bake-size';
import { deriveMechanics } from '@/lib/utils/battle/map-art/derive';
import type { MapArtScene } from '@/types/battle-map';

export function composeArtSave(input: {
    save: BattleMapSaveInput;
    scene: MapArtScene;
    bakedUrl?: string;
}): BattleMapSaveInput {
    const { save, scene, bakedUrl } = input;

    const { walls, bars, doors, blocked, sightBlocked } = deriveMechanics(
        scene,
        save.map
    );

    const {
        blocked: _blocked,
        sightBlocked: _sightBlocked,
        ...rest
    } = save.map;

    const { gridOffset: _offset, ...noOffset } = rest;

    const map = {
        ...(bakedUrl ? noOffset : rest),
        doors,
        ...(blocked.length ? { blocked } : {}),
        ...(sightBlocked.length ? { sightBlocked } : {}),
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
