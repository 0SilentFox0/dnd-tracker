'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { asShownCrit } from '@/lib/utils/battle/crit-choice/pending';
import type { RiderOffer } from '@/lib/utils/battle/crit-choice/types';
import { critChoiceOp } from '@/systems/d20/api/battle';

export interface RiderChoiceRow {
    offer: RiderOffer;
    holderName: string;
}

export function useRiderRows() {
    const { battle } = useBattleScene();

    const offers = asShownCrit(battle.pendingChoice)?.riders ?? [];

    const holder = (id: string) =>
        battle.initiativeOrder.find((p) => p.basicInfo.id === id);

    const rows: RiderChoiceRow[] = offers.map((offer) => ({
        offer,
        holderName: holder(offer.holderId)?.basicInfo.name ?? '',
    }));

    return { offers, rows, holder };
}

export function useRiderChoiceDialog() {
    const { battle, viewer, actions } = useBattleScene();

    const pending = asShownCrit(battle.pendingChoice);

    const { offers, rows, holder } = useRiderRows();

    const mine = offers.every(
        (o) =>
            viewer.isDM ||
            (!!viewer.userId &&
                holder(o.holderId)?.basicInfo.controlledBy === viewer.userId)
    );

    return {
        open: offers.length > 0 && pending?.triggers.length === 0 && mine,
        rows,
        submit: (riders: Record<string, boolean>) =>
            actions.system.mutate(critChoiceOp({ choices: {}, riders })),
        isSubmitting: isSystemActionPending(actions.system, 'crit-choice'),
    };
}
