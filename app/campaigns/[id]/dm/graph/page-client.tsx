"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";

const ScenarioGraph = dynamic(() => import("@/components/scenario/graph").then((m) => m.ScenarioGraph), { ssr: false, loading: () => <LoadingState /> });

export function GraphPageClient({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const t = useTranslations("dashboard.sections.graph");

  return (
    <HudPage>
      <HudPageHeader title={t("title")} subtitle={campaignName} />
      <OnboardingHint id="dm.graph" />
      <ScenarioGraph campaignId={campaignId} />
    </HudPage>
  );
}
