import { useBattleScene } from './useBattleScene';

import { useCharacterSheet } from '@/lib/hooks/characters';
import type { BattleParticipant } from '@/types/battle';

/** Інвентар героя в бою: лист для вкладки та застосування змін до учасника за бонусну дію. */
export function useGearSwap(
    hero: BattleParticipant,
    done: { onOpenChange: (open: boolean) => void; onDone: () => void }
) {
    const {
        campaignId,
        actions: { swapGear },
    } = useBattleScene();

    const sheet = useCharacterSheet(campaignId, hero.basicInfo.sourceId);

    const apply = async () => {
        try {
            await swapGear.mutateAsync({ participantId: hero.basicInfo.id });
        } catch {
            return;
        }

        done.onOpenChange(false);
        done.onDone();
    };

    return {
        campaignId,
        characterId: hero.basicInfo.sourceId,
        sheet,
        apply,
        isPending: swapGear.isPending,
        canApply: !hero.actionFlags.hasUsedBonusAction,
    };
}
