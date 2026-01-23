"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

import { CampaignSettingsDialog } from "@/components/campaigns/settings/CampaignSettingsDialog";
import { Button } from "@/components/ui/button";

interface CampaignSettingsButtonProps {
  campaignId: string;
  initialName: string;
  initialDescription: string | null;
  initialMaxLevel: number;
  initialXpMultiplier: number;
  initialAllowPlayerEdit: boolean;
  initialStatus: string;
}

export function CampaignSettingsButton({
  campaignId,
  initialName,
  initialDescription,
  initialMaxLevel,
  initialXpMultiplier,
  initialAllowPlayerEdit,
  initialStatus,
}: CampaignSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  const router = useRouter();

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
        <Settings className="h-4 w-4" />
        <span className="sr-only">Редагувати налаштування</span>
      </Button>
      <CampaignSettingsDialog
        campaignId={campaignId}
        initialName={initialName}
        initialDescription={initialDescription}
        initialMaxLevel={initialMaxLevel}
        initialXpMultiplier={initialXpMultiplier}
        initialAllowPlayerEdit={initialAllowPlayerEdit}
        initialStatus={initialStatus}
        open={open}
        onOpenChange={setOpen}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}
