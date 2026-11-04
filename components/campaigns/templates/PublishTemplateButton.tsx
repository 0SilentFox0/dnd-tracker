"use client";

import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePublishTemplate } from "@/lib/hooks/campaigns";

export function PublishTemplateButton({ campaignId }: { campaignId: string }) {
  const t = useTranslations("campaigns");

  const { publish, isPending } = usePublishTemplate(campaignId);

  return (
    <Button variant="outline" onClick={publish} disabled={isPending}>
      <Upload className="mr-2 h-4 w-4" />
      {t("publishTemplate.button")}
    </Button>
  );
}
