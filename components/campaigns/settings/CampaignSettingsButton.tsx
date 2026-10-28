"use client";

import { useState } from "react";
import { Settings } from "lucide-react";

import { CampaignSettingsDialog } from "@/components/campaigns/settings/CampaignSettingsDialog";
import { Button } from "@/components/ui/button";
import type { CampaignSettings, CampaignSettingsMeta } from "@/types/campaigns";

interface CampaignSettingsButtonProps {
  campaignId: string;
  campaign: CampaignSettings;
  meta: CampaignSettingsMeta;
}

export function CampaignSettingsButton({ campaignId, campaign, meta }: CampaignSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  const [openCount, setOpenCount] = useState(0);

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => {
          setOpenCount((n) => n + 1);
          setOpen(true);
        }}>
        <Settings className="h-4 w-4" />
        <span className="sr-only">Редагувати налаштування</span>
      </Button>
      {/* Remount per opening so the form starts from the saved values. */}
      <CampaignSettingsDialog key={openCount} campaignId={campaignId} campaign={campaign} meta={meta} open={open} onOpenChange={setOpen} />
    </>
  );
}
