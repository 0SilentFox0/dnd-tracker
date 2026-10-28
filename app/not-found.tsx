"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/states";
import { HudPage, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <HudPage width="md">
      <HudPanel>
        <EmptyState
          title={t("notFound.title")}
          action={
            <Button asChild>
              <Link href="/campaigns">{t("notFound.home")}</Link>
            </Button>
          }
        />
      </HudPanel>
    </HudPage>
  );
}
