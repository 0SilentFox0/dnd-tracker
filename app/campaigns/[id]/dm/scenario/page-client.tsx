"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { CreateScenarioPageDialog, ScenarioBook, ScenarioIndex, ScenarioSearch } from "@/components/scenario";
import { Button } from "@/components/ui/button";
import { useScenarioPageActions, useScenarioPages } from "@/lib/hooks/scenario";

export function ScenarioIndexPageClient({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const t = useTranslations("scenario.indexPage");

  const router = useRouter();

  const pages = useScenarioPages(campaignId);

  const actions = useScenarioPageActions(campaignId);

  const [creating, setCreating] = useState(false);

  return (
    <ScenarioBook>
      <div className="sb-index">
        <h1>{campaignName}</h1>
        <p className="lead">{t("lead")}</p>
        <OnboardingHint id="dm.scenario" className="my-3 text-left" />
        <div className="sb-tools">
          <ScenarioSearch campaignId={campaignId} />
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="size-4" />
            {t("newPage")}
          </Button>
        </div>
        <QueryState query={pages} empty={<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />}>
          {(list) => <ScenarioIndex campaignId={campaignId} pages={list} onMove={(id, dir, siblings) => void actions.move(id, dir, siblings).catch(() => {})} />}
        </QueryState>
      </div>
      <CreateScenarioPageDialog
        open={creating}
        onOpenChange={setCreating}
        campaignId={campaignId}
        pending={actions.isPending}
        onSubmit={(data) =>
          void actions
            .create(data)
            .then((page) => {
              setCreating(false);
              router.push(`/campaigns/${campaignId}/dm/scenario/${page.id}`);
            })
            .catch(() => {})
        }
      />
    </ScenarioBook>
  );
}
