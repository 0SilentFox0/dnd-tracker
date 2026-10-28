"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { SourceSyncDialog } from "@/components/campaigns/templates/SourceSyncDialog";
import { Button } from "@/components/ui/button";
import { syncTitle } from "@/lib/constants/source-sync";

interface SourceSyncButtonProps {
  campaignId: string;
  isTemplate: boolean;
}

export function SourceSyncButton({ campaignId, isTemplate }: SourceSyncButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {syncTitle(isTemplate)}
      </Button>
      <SourceSyncDialog campaignId={campaignId} isTemplate={isTemplate} open={open} onOpenChange={setOpen} />
    </>
  );
}
