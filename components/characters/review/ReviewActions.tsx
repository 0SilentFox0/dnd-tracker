"use client";

import { type FormEvent, useState } from "react";

import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useReviewCharacter } from "@/lib/hooks/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";

const FORM_ID = "review-return-form";

export function ReviewActions({ campaignId, characterId, name }: { campaignId: string; characterId: string; name: string }) {
  const review = useReviewCharacter(campaignId, characterId);

  const confirm = useConfirm();

  const notify = useNotify();

  const [open, setOpen] = useState(false);

  const [note, setNote] = useState("");

  const approve = () =>
    confirm({
      title: "Схвалити персонажа?",
      description: `«${name}» стане активним персонажем гравця.`,
      confirmLabel: "Схвалити",
      onConfirm: async () => {
        await review.approve();
        void notify("Персонажа схвалено");
      },
    });

  const sendBack = async (e: FormEvent) => {
    e.preventDefault();

    try {
      await review.returnWithNote(note.trim());
      setOpen(false);
      setNote("");
      void notify("Чернетку повернуто гравцю");
    } catch (error) {
      void notify(error instanceof Error && error.message ? error.message : "Не вдалося повернути чернетку");
    }
  };

  return (
    <HudPanel className="mx-3 mt-3">
      <HudSection
        title="Чернетка гравця"
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void approve()} disabled={review.isPending}>
              Схвалити
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)} disabled={review.isPending}>
              Повернути з коментарем
            </Button>
          </div>
        }
      >
        <p className="text-sm text-hud-muted">Відредагуйте персонажа за потреби, потім схваліть або поверніть гравцю. Видалити чернетку можна у вкладці «Основне» редактора.</p>
      </HudSection>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        size="sm"
        hud
        title="Повернути з коментарем"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Скасувати
            </Button>
            <Button type="submit" form={FORM_ID} disabled={review.isPending || !note.trim()}>
              Повернути
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={(e) => void sendBack(e)}>
          <Textarea required maxLength={1000} rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Що потрібно виправити" />
        </form>
      </ResponsiveDialog>
    </HudPanel>
  );
}
