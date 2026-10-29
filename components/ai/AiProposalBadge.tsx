"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function AiProposalBadge({ count, onClick }: { count: number; onClick: () => void }) {
  const t = useTranslations("ai");

  if (count === 0) return null;

  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick} aria-label={t("panel.badge", { count })}>
      {count}
    </Button>
  );
}
