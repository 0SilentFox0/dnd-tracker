import { type SystemBattleUi, systemUiOf } from '@/components/systems';
import { useBattleSceneData } from '@/lib/hooks/battle';

export function useSystemBattleUi(): SystemBattleUi {
    const { system } = useBattleSceneData().battle.rules;

    return systemUiOf(system.key, system.modules).battle;
}
