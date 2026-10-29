import Link from "next/link";
import { useTranslations } from "next-intl";

import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";

export function DraftBanner({ campaignId, note, isOwner }: { campaignId: string; note: string | null; isOwner: boolean }) {
  const t = useTranslations("characters.draftBanner");

  return (
    <HudPanel className="mx-3 mt-3 flex flex-col gap-2 border-hud-gold/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="hud-sc text-hud-gold">{t("pending")}</p>
        {note && <p className="mt-1 text-sm text-hud-muted">{t("note", { note })}</p>}
      </div>
      {isOwner && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/campaigns/${campaignId}/character/draft`}>{t("edit")}</Link>
        </Button>
      )}
    </HudPanel>
  );
}
