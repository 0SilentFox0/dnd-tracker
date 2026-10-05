"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeCampaignMember } from "@/lib/api/campaigns";
import { useConfirm, useNotify } from "@/lib/hooks/common";

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
  const notify = useNotify();

  const confirm = useConfirm();

  const router = useRouter();

  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const handleRemoveMember = async (memberId: string) => {
    if (!(await confirm({ title: "Ви впевнені, що хочете виключити цього учасника з кампанії?", confirmLabel: "Виключити", destructive: true }))) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      await removeCampaignMember(campaignId, memberId);

      router.refresh();
    } catch (error) {
      console.error("Error removing member:", error);
      void notify(error instanceof Error ? error.message : "Помилка при видаленні учасника");
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-2 border rounded"
        >
          <div className="flex items-center gap-2">
            <span>{member.user.displayName}</span>
            <Badge variant={member.role === "dm" ? "default" : "secondary"}>
              {member.role === "dm" ? "DM" : "Player"}
            </Badge>
          </div>
          {isDM && member.role === "player" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveMember(member.id)}
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
