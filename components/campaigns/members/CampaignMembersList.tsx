"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();

  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Ви впевнені, що хочете виключити цього учасника з кампанії?")) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/members/${memberId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Помилка при видаленні учасника");
      }

      // Оновлюємо сторінку після успішного видалення
      router.refresh();
    } catch (error) {
      console.error("Error removing member:", error);
      alert(error instanceof Error ? error.message : "Помилка при видаленні учасника");
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
