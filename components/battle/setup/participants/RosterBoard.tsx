'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { BalanceMeter, type BalanceView } from '../balance/BalanceMeter';
import type { SetupData } from './ParticipantCatalog';
import { SetupParticipantRow } from './SetupParticipantRow';

import { Disclosure } from '@/components/ui/disclosure';
import { ParticipantSide, ParticipantSourceType } from '@/lib/constants/battle';
import type { ParticipantActions } from '@/lib/hooks/battles';
import { cn } from '@/lib/utils';
import type { BattlePreparationParticipant } from '@/types/battle';

interface RosterBoardProps {
    participants: BattlePreparationParticipant[];
    data: SetupData;
    actions: Pick<ParticipantActions, 'setSide' | 'remove' | 'setReserve'>;
    balance: BalanceView;
    autopick?: ReactNode;
}

function SideColumn({
    side,
    members,
    data,
    actions,
}: {
    side: ParticipantSide;
    members: BattlePreparationParticipant[];
    data: SetupData;
    actions: RosterBoardProps['actions'];
}) {
    const t = useTranslations('battleSetup.roster');

    const tParticipants = useTranslations('battleSetup.participants');

    const otherSide =
        side === ParticipantSide.ALLY
            ? ParticipantSide.ENEMY
            : ParticipantSide.ALLY;

    const rows = members.flatMap((member) => {
        const entity = (
            member.type === ParticipantSourceType.UNIT
                ? data.units
                : data.characters
        ).find((e) => e.id === member.id);

        return entity ? [{ member, entity }] : [];
    });

    const total = rows.reduce((n, r) => n + (r.member.quantity ?? 1), 0);

    return (
        <section
            data-side={side}
            aria-label={t(`sides.${side}.title`)}
            className="min-w-0 space-y-2"
        >
            <h3 className="hud-sc flex items-center gap-2 text-sm tracking-[.06em] text-hud-muted">
                <span
                    aria-hidden
                    className={cn(
                        'size-2 rounded-full',
                        side === ParticipantSide.ALLY
                            ? 'bg-hud-accent'
                            : 'bg-hud-crimson'
                    )}
                />
                {t(`sides.${side}.title`)}
                <span
                    className="hud-num tabular-nums"
                    title={tParticipants('sideCount', { count: total })}
                >
                    {total}
                </span>
            </h3>
            {rows.length === 0 ? (
                <p
                    data-testid={`roster-empty-${side}`}
                    className="rounded-xl border border-dashed border-hud-line px-3 py-6 text-center text-sm text-hud-muted"
                >
                    {tParticipants(
                        side === ParticipantSide.ALLY
                            ? 'emptyAllies'
                            : 'emptyEnemies'
                    )}
                </p>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,8.5rem)] items-start gap-3">
                    {rows.map(({ member, entity }) => (
                        <SetupParticipantRow
                            key={member.id}
                            name={entity.name}
                            avatar={entity.avatar}
                            quantity={
                                member.type === ParticipantSourceType.UNIT
                                    ? (member.quantity ?? 1)
                                    : undefined
                            }
                            side={side}
                            reserved={member.reserved ?? 0}
                            actions={{
                                onMoveToOtherSide: () =>
                                    actions.setSide(member.id, otherSide),
                                onRemove: () => actions.remove(member.id),
                                onReserveChange: (n) =>
                                    actions.setReserve(member.id, n),
                            }}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

export function RosterBoard({
    participants,
    data,
    actions,
    balance,
    autopick,
}: RosterBoardProps) {
    const t = useTranslations('battleSetup.participants');

    return (
        <div className="@container min-w-0 space-y-3">
            <BalanceMeter {...balance} units={data.units} />
            {autopick && (
                <Disclosure
                    summary={t('autopick')}
                    headingLevel={3}
                    triggerClassName="hud-sc min-h-9 text-sm tracking-[.06em] text-hud-muted"
                    className="border-b-0"
                    contentClassName="pt-2"
                >
                    {autopick}
                </Disclosure>
            )}
            <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
                {[ParticipantSide.ALLY, ParticipantSide.ENEMY].map((side) => (
                    <SideColumn
                        key={side}
                        side={side}
                        members={participants.filter((p) => p.side === side)}
                        data={data}
                        actions={actions}
                    />
                ))}
            </div>
        </div>
    );
}
