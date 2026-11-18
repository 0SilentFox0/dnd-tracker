import { useMapBackgroundTool } from './useMapBackgroundTool';
import { useMapDoors } from './useMapDoors';
import { useMapMotionTool } from './useMapMotionTool';
import { useMapUpdateTool } from './useMapUpdateTool';
import { useMapWeatherTool } from './useMapWeatherTool';

import type { BattleSceneValue } from '@/lib/hooks/battle/types';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export function useMapDmTools({
    isDM,
    map,
    battle,
    actions,
    current,
    isMyTurn,
    campaignId,
    notify,
}: {
    isDM: boolean;
    map: BattleMapConfig | null;
    battle: BattleSceneValue['battle'];
    actions: BattleSceneValue['actions'];
    current: BattleParticipant | null | undefined;
    isMyTurn: boolean;
    campaignId: string;
    notify: BattleSceneValue['toast']['show'];
}) {
    const weatherTool = useMapWeatherTool({
        isDM,
        current: map?.weather ?? null,
        mutation: actions.mapWeather,
    });

    const motionTool = useMapMotionTool({
        isDM,
        current: map?.motion ?? null,
        mutation: actions.mapMotion,
    });

    const backgroundTool = useMapBackgroundTool({
        isDM,
        current: map?.background ?? null,
        mutation: actions.mapBackground,
    });

    const doors = useMapDoors({
        isDM,
        current: current ?? undefined,
        isMyTurn,
        mutation: actions.mapDoorToggle,
        notify,
    });

    const mapUpdate = useMapUpdateTool({
        isDM,
        campaignId,
        mapRef: battle.mapRef,
        mutation: actions.mapUpdate,
        notify,
    });

    return { weatherTool, motionTool, backgroundTool, doors, mapUpdate };
}
