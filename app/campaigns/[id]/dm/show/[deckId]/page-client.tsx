"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Images } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { AddSlidesBar } from "@/components/show/editor/AddSlidesBar";
import { SlideDialog } from "@/components/show/editor/SlideDialog";
import { SlideGrid } from "@/components/show/editor/SlideGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DECK_TITLE_MAX } from "@/lib/constants/show";
import { useNotify } from "@/lib/hooks/common";
import { useDeckEditor, useShowControl } from "@/lib/hooks/show";
import type { SlideDeck } from "@/types/show";

export function DeckEditorPageClient({ campaignId, deck }: { campaignId: string; deck: SlideDeck }) {
  const router = useRouter();

  const notify = useNotify();

  const editor = useDeckEditor(campaignId, deck);

  const control = useShowControl(campaignId, (message) => void notify(message));

  const [editingId, setEditingId] = useState<string | null>(null);

  const { draft, dispatch, dirty, saving } = editor;

  const base = `/campaigns/${campaignId}`;

  const editingIndex = draft.slides.findIndex((s) => s.id === editingId);

  const editing = editingIndex === -1 ? null : { slide: draft.slides[editingIndex], index: editingIndex };

  const startShow = async () => {
    if (dirty && !(await editor.save())) return;

    if (await control.send({ action: "open", deckId: deck.id })) router.push(`${base}/show`);
  };

  return (
    <HudFormPage
      title="Набір слайдів"
      aside={
        <Link href={`${base}/dm/show`} className="underline">
          ← До наборів
        </Link>
      }
    >
      <HudForm
        id="deck-editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void editor.save();
        }}
        actions={
          <>
            <Button type="submit" disabled={!dirty || saving}>
              Зберегти
            </Button>
            <Button type="button" variant="outline" disabled={saving || control.pending || draft.slides.length === 0} onClick={() => void startShow()}>
              Почати показ
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input aria-label="Назва набору" placeholder="Назва набору" maxLength={DECK_TITLE_MAX} value={draft.title} onChange={(e) => dispatch({ type: "rename", title: e.target.value })} />
          <AddSlidesBar upload={editor.upload} count={draft.slides.length} />
          {draft.slides.length === 0 ? (
            <EmptyState icon={Images} title="Ще немає слайдів" description="Додайте картинки — файли або посилання" />
          ) : (
            <SlideGrid slides={draft.slides} actions={{ dispatch, edit: setEditingId }} />
          )}
        </div>
      </HudForm>
      <SlideDialog campaignId={campaignId} slide={editing} actions={{ dispatch, close: () => setEditingId(null) }} />
    </HudFormPage>
  );
}
