"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Images, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { DeckCard } from "@/components/show/editor/DeckCard";
import { NewDeckDialog } from "@/components/show/editor/NewDeckDialog";
import { Button } from "@/components/ui/button";
import { useNotify } from "@/lib/hooks/common";
import { useDeckMutations, useDecks, useShowControl } from "@/lib/hooks/show";
import { pluralUk } from "@/lib/utils/common/plural";
import type { SlideDeckSummary } from "@/types/show";

export function DMShowPageClient({ campaignId, initialDecks }: { campaignId: string; initialDecks: SlideDeckSummary[] }) {
  const router = useRouter();

  const notify = useNotify();

  const { data: decks = [] } = useDecks(campaignId, { initial: initialDecks });

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
        title="Показ сцен"
        subtitle={`${decks.length} ${pluralUk(decks.length, ["набір", "набори", "наборів"])}`}
        actions={
          <>
            <Button onClick={() => setCreating(true)} className="flex items-center gap-2">
              <Plus className="size-4" />
              Новий набір
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/show`}>Відкрити показ</Link>
            </Button>
          </>
        }
      />
      {decks.length === 0 ? (
        <EmptyState icon={Images} title="Ще немає наборів" description="Створіть набір слайдів із картинок і музики та покажіть його гравцям." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              href={`${base}/dm/show/${deck.id}`}
              actions={{ start: () => void start(deck.id), remove: () => void mutations.remove(deck.id) }}
              pending={mutations.pending || control.pending}
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
