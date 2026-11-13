'use client';

import { memo, useMemo } from 'react';

import { ParticipantRow } from './ParticipantRow';
import { ReserveParticipantRow } from './ReserveParticipantRow';

import { useSystemBattleUi } from '@/components/battle/use-system-battle-ui';
import { ParticipantSide } from '@/lib/constants/battle';
import {
    useBattleRules,
    useBattleSceneData,
    useFxImpacts,
    useModeView,
} from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { canSeeExactStats, NO_EFFECTS } from '@/lib/utils/battle/view';

export const ParticipantList = memo(function ParticipantList({
    side,
    className,
}: {
    side: ParticipantSide;
    className?: string;
}) {
    const {
        roster: { allies, enemies, reserve },
        battle,
        viewer,
        turn: { current },
        clickParticipant,
        effects,
    } = useBattleSceneData();

    const { hpTerm } = useBattleRules();

    const { defense, badges } = useSystemBattleUi();

    const impactFor = useFxImpacts();

    const maskedIds = useModeView().view?.maskedIds;

    const list = side === ParticipantSide.ALLY ? allies : enemies;

    const reserved = reserve.filter((p) => p.basicInfo.side === side);

    const { initiativeOrder: order, battleLog, knowledge } = battle;

    const rows = useMemo(
        () =>
            list.map((p) => {
                const exact = canSeeExactStats(p, viewer);

                const acText =
                    defense?.(p, {
                        order,
                        log: battleLog ?? [],
                        knowledge,
                        exact,
                    }) ?? null;

                return { participant: p, exact, acText };
            }),
        [list, viewer, order, battleLog, knowledge, defense]
    );

    return (
        <div className={cn('px-4', className)}>
            {rows.map(({ participant, exact, acText }) => (
                <ParticipantRow
                    key={participant.basicInfo.id}
                    participant={participant}
                    effects={
                        effects.get(participant.basicInfo.id) ?? NO_EFFECTS
                    }
                    view={{
                        exact,
                        acText,
                        wounds: hpTerm === 'wounds',
                        current:
                            current?.basicInfo.id === participant.basicInfo.id,
                        masked:
                            maskedIds?.has(participant.basicInfo.id) ?? false,
                    }}
                    impact={impactFor(participant.basicInfo.id)}
                    onSelect={clickParticipant}
                    badges={badges}
                />
            ))}
            {reserved.map((p) => (
                <ReserveParticipantRow key={p.basicInfo.id} participant={p} />
            ))}
        </div>
    );
});
