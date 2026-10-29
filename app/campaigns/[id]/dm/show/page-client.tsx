"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Images, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { DeckCard } from "@/components/show/editor/DeckCard";
import { NewDeckDialog } from "@/components/show/editor/NewDeckDialog";
import { Button } from "@/components/ui/button";
import { WorldMapLink } from "@/components/world/WorldMapLink";
import { useNotify } from "@/lib/hooks/common";
import { useScenarioPages } from "@/lib/hooks/scenario";
import { useDeckMutations, useDecks, useShowControl } from "@/lib/hooks/show";
import type { SlideDeckSummary } from "@/types/show";

export function DMShowPageClient({ campaignId, initialDecks }: { campaignId: string; initialDecks: SlideDeckSummary[] }) {
  const t = useTranslations("show");

  const router = useRouter();

  const notify = useNotify();

  const { data: decks = [] } = useDecks(campaignId, { initial: initialDecks });

  const { data: pages = [] } = useScenarioPages(campaignId);

  const mutations = useDeckMutations(campaignId);

  const control = useShowControl(campaignId, notify);

  const [creating, setCreating] = useState(false);

  const base = `/campaigns/${campaignId}`;

  const start = async (deckId: string) => {
    if (await control.send({ action: "open", deckId })) router.push(`${base}/show`);
  };

  return (
    <HudPage>
      <HudPageHeader
        title={t("decksPage.title")}
        subtitle={t("decksPage.count", { count: decks.length })}
        actions={
          <>
            <Button onClick={() => setCreating(true)} className="flex items-center gap-2">
              <Plus className="size-4" />
              {t("newDeck.title")}
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/show`}>{t("decksPage.openShow")}</Link>
            </Button>
            <WorldMapLink campaignId={campaignId} variant="button" />
          </>
        }
      />
      <OnboardingHint id="dm.show" />
      {decks.length === 0 ? (
        <EmptyState icon={Images} title={t("decksPage.emptyTitle")} description={t("decksPage.emptyDescription")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              href={`${base}/dm/show/${deck.id}`}
              actions={{ start: () => void start(deck.id), remove: () => void mutations.remove(deck.id) }}
              pending={mutations.pending || control.pending}
              scene={pages.find((p) => p.id === deck.scenarioPageId)?.title}
            />
          ))}
        </div>
      )}
      <NewDeckDialog
        open={creating}
        onOpenChange={setCreating}
        pending={mutations.pending}
        onCreate={async (title) => {
          const deck = await mutations.create(title);

          if (deck) router.push(`${base}/dm/show/${deck.id}`);

          return !!deck;
        }}
      />
    </HudPage>
  );
}
