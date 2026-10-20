"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { CreateScenarioPageDialog, ScenarioBook, ScenarioIndex, ScenarioSearch } from "@/components/scenario";
import { Button } from "@/components/ui/button";
import { useCharacters } from "@/lib/hooks/characters";
import { useScenarioPageActions, useScenarioPages } from "@/lib/hooks/scenario";
import type { ScenarioPageSummary } from "@/types/scenario";

export function ScenarioIndexPageClient({ campaignId, campaignName, initialPages }: { campaignId: string; campaignName: string; initialPages: ScenarioPageSummary[] }) {
  const router = useRouter();

  const { data: pages = initialPages } = useScenarioPages(campaignId, initialPages);

  const actions = useScenarioPageActions(campaignId);

  const { data: roster = [] } = useCharacters(campaignId, { compact: true });

  const characters = roster.map((c) => ({ id: c.id, name: c.name }));

  const [creating, setCreating] = useState(false);

  return (
    <ScenarioBook>
      <div className="sb-index">
        <h1>{campaignName}</h1>
        <p className="lead">Книга майстра: сцени для ведення, кожна на окремій сторінці.</p>
        <div className="sb-tools">
          <ScenarioSearch campaignId={campaignId} />
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="size-4" />
            Нова сторінка
          </Button>
        </div>
        {pages.length === 0 ? <EmptyState title="Сценарій порожній" description="Створіть першу сцену або імпортуйте наявні." /> : <ScenarioIndex campaignId={campaignId} pages={pages} onMove={(id, dir, siblings) => void actions.move(id, dir, siblings).catch(() => {})} />}
      </div>
      <CreateScenarioPageDialog
        open={creating}
        onOpenChange={setCreating}
        characters={characters}
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
