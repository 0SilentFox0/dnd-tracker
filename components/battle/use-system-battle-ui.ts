import { type SystemBattleUi, systemUiOf } from '@/components/systems';
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
