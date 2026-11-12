'use client';

import { useTranslations } from 'next-intl';
import { Crown, ShieldOff, X } from 'lucide-react';

import { HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { CampaignRole } from '@/lib/constants/campaigns';
import {
    useRemoveCampaignMember,
    useSetCampaignMemberRole,
} from '@/lib/hooks/campaigns';
import { useConfirm } from '@/lib/hooks/common';
import type { CampaignMembership, PublicUser } from '@/types/campaigns';

interface CampaignMembersListProps {
    campaignId: string;
    members: Array<CampaignMembership & { user: PublicUser }>;
    isDM: boolean;
    isOwner: boolean;
    ownerId: string;
}

export function CampaignMembersList({
    campaignId,
    members,
    isDM,
    isOwner,
    ownerId,
}: CampaignMembersListProps) {
    const t = useTranslations('campaigns');

    const confirm = useConfirm();

    const removeMember = useRemoveCampaignMember(campaignId);

    const setRole = useSetCampaignMemberRole(campaignId);

    const handlePromoteMember = (memberId: string) =>
        confirm({
            title: t('members.confirmPromote'),
            confirmLabel: t('members.promote'),
            onConfirm: () =>
                setRole.mutateAsync({ memberId, role: CampaignRole.DM }),
        });

    const handleDemoteMember = (memberId: string) =>
        confirm({
            title: t('members.confirmDemote'),
            confirmLabel: t('members.demote'),
            destructive: true,
            onConfirm: () =>
                setRole.mutateAsync({ memberId, role: CampaignRole.PLAYER }),
        });

    const handleRemoveMember = (memberId: string) =>
        confirm({
            title: t('members.confirmRemove'),
            confirmLabel: t('members.remove'),
            destructive: true,
            onConfirm: () => removeMember.mutateAsync(memberId),
        });

    const removingMemberId = removeMember.isPending
        ? removeMember.variables
        : null;

    const roleChangingId = setRole.isPending
        ? setRole.variables?.memberId
        : null;

    return (
        <div className="space-y-2">
            {members.map((member) => (
                <div
                    key={member.id}
                    className="flex items-center justify-between gap-2 border-b border-hud-raised p-2 last:border-b-0"
                >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="min-w-0 break-words text-hud-bone">
                            {member.user.displayName}
                        </span>
                        <HudPill
                            tone={
                                member.role === CampaignRole.DM
                                    ? 'gold'
                                    : 'bone'
                            }
                        >
                            {member.role === CampaignRole.DM
                                ? t('roles.dm')
                                : t('roles.player')}
                        </HudPill>
                    </div>
                    <div className="flex shrink-0 items-center">
                        {isDM && member.role === CampaignRole.PLAYER && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title={t('members.promote')}
                                    aria-label={t('members.promote')}
                                    onClick={() =>
                                        void handlePromoteMember(member.id)
                                    }
                                    disabled={roleChangingId === member.id}
                                >
                                    <Crown className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title={t('members.remove')}
                                    aria-label={t('members.remove')}
                                    onClick={() =>
                                        void handleRemoveMember(member.id)
                                    }
                                    disabled={removingMemberId === member.id}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {isOwner &&
                            member.role === CampaignRole.DM &&
                            member.userId !== ownerId && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title={t('members.demote')}
                                    aria-label={t('members.demote')}
                                    onClick={() =>
                                        void handleDemoteMember(member.id)
                                    }
                                    disabled={roleChangingId === member.id}
                                >
                                    <ShieldOff className="h-4 w-4" />
                                </Button>
                            )}
                    </div>
                </div>
            ))}
        </div>
    );
}
