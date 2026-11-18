import {
    type SystemBattleUi,
    type SystemUi,
    systemUiOf,
} from '@/components/systems';
import { useBattleSceneData } from '@/lib/hooks/battle';
import type { SystemFx } from '@/lib/utils/battle/fx';

export function useSystemBattleUi(): SystemBattleUi {
    const { system } = useBattleSceneData().battle.rules;

    return systemUiOf(system.key, system.modules).battle;
}

export function useSystemFx(): SystemFx | undefined {
    const { system } = useBattleSceneData().battle.rules;

    return systemUiOf(system.key, system.modules).fx;
}

export function useRerollTokenUi(): SystemUi['rerollToken'] {
    const { system } = useBattleSceneData().battle.rules;

    return systemUiOf(system.key, system.modules).rerollToken;
}
