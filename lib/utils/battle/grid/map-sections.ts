import { isEdgeTool, type SetupTool } from '@/lib/utils/battle/grid/map-editor';

export const BATTLE_MAP_SECTIONS = [
    'grid',
    'calibration',
    'background',
    'margins',
    'cells',
    'edges',
    'mode',
    'motion',
] as const;

export type BattleMapSection = (typeof BATTLE_MAP_SECTIONS)[number];

export type SectionStatus = 'enabled' | 'disabled' | 'hidden';

export interface BattleMapSectionState {
    id: BattleMapSection;
    status: SectionStatus;
    reason?: 'edgesDesktopOnly' | 'edgesDisabledMode';
}

export interface BattleMapSectionFlags {
    touch: boolean;
    hidesTerrain: boolean;
    hasModes: boolean;
    hasMotion: boolean;
}

function stateOf(
    id: BattleMapSection,
    f: BattleMapSectionFlags
): BattleMapSectionState {
    switch (id) {
        case 'cells':
            return f.hidesTerrain
                ? { id, status: 'disabled', reason: 'edgesDisabledMode' }
                : { id, status: 'enabled' };
        case 'edges':
            if (f.hidesTerrain) {
                return { id, status: 'disabled', reason: 'edgesDisabledMode' };
            }

            return f.touch
                ? { id, status: 'disabled', reason: 'edgesDesktopOnly' }
                : { id, status: 'enabled' };
        case 'mode':
            return { id, status: f.hasModes ? 'enabled' : 'hidden' };
        case 'motion':
            return { id, status: f.hasMotion ? 'enabled' : 'hidden' };
        default:
            return { id, status: 'enabled' };
    }
}

export function battleMapSections(
    f: BattleMapSectionFlags
): BattleMapSectionState[] {
    return BATTLE_MAP_SECTIONS.map((id) => stateOf(id, f));
}

export function sectionOfTool(tool: SetupTool): 'cells' | 'edges' {
    return isEdgeTool(tool) ? 'edges' : 'cells';
}
