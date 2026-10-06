"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampaignRole } from "@/lib/constants/campaigns";
import { useRemoveCampaignMember } from "@/lib/hooks/campaigns";
import { useConfirm } from "@/lib/hooks/common";

const CHIP = "rounded-full px-2 text-[11px]";

const DM_CHIP = `${CHIP} bg-[linear-gradient(135deg,#8a6414,#e6c25a_55%,#8a6414)] text-[#2a1d05]`;

const PLAYER_CHIP = `${CHIP} text-[#e6dccb] shadow-[inset_0_0_0_1px_#4a3c2c]`;

interface CampaignMember {
  id: string;
  userId: string;
  role: string;
  user: {
    displayName: string;
  };
}

interface CampaignMembersListProps {
  campaignId: string;
  members: CampaignMember[];
  isDM: boolean;
}

export function CampaignMembersList({
  campaignId,
  members,
  isDM,
}: CampaignMembersListProps) {
  const confirm = useConfirm();

  const removeMember = useRemoveCampaignMember(campaignId);

  const handleRemoveMember = (memberId: string) =>
    confirm({
      title: "Ви впевнені, що хочете виключити цього учасника з кампанії?",
      confirmLabel: "Виключити",
      destructive: true,
      onConfirm: () => removeMember.mutateAsync(memberId),
    });

  const removingMemberId = removeMember.isPending ? removeMember.variables : null;

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between border-b border-[#2a2218] p-2 last:border-b-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-[#e6dccb]">{member.user.displayName}</span>
            <span className={member.role === CampaignRole.DM ? DM_CHIP : PLAYER_CHIP}>
              {member.role === CampaignRole.DM ? "DM" : "Player"}
            </span>
          </div>
          {isDM && member.role === CampaignRole.PLAYER && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleRemoveMember(member.id)}
              disabled={removingMemberId === member.id}
            >
              {removingMemberId === member.id ? (
                "Видалення..."
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Виключити
                </>
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
