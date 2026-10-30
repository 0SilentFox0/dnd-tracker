"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/states";
import { HudPage } from "@/components/hud/page";
import { Button } from "@/components/ui/button";

export function NoCharacterState({ campaignId, canCreate }: { campaignId: string; canCreate: boolean }) {
  const t = useTranslations("characters.noCharacter");

  const base = `/campaigns/${campaignId}/character/new`;

  return (
    <HudPage>
      <EmptyState
        title={t("title")}
        action={
          canCreate ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href={base}>{t("create")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`${base}?generate=1`}>{t("generate")}</Link>
              </Button>
            </div>
          ) : undefined
        }
      />
    </HudPage>
  );
}
