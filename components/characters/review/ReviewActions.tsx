"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useReviewCharacter } from "@/lib/hooks/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";

const FORM_ID = "review-return-form";

export function ReviewActions({ campaignId, characterId, name }: { campaignId: string; characterId: string; name: string }) {
  const t = useTranslations("characters.review");

  const tc = useTranslations("common.actions");

  const review = useReviewCharacter(campaignId, characterId);

  const confirm = useConfirm();

  const notify = useNotify();

  const [open, setOpen] = useState(false);

  const [note, setNote] = useState("");

  const approve = () =>
    confirm({
      title: t("approveTitle"),
      description: t("approveDescription", { name }),
      confirmLabel: t("approve"),
      onConfirm: async () => {
        await review.approve();
        void notify(t("approved"));
      },
    });

  const sendBack = async (e: FormEvent) => {
    e.preventDefault();

    try {
      await review.returnWithNote(note.trim());
      setOpen(false);
      setNote("");
      void notify(t("returned"));
    } catch (error) {
      void notify(error instanceof Error && error.message ? error.message : t("returnFailed"));
    }
  };

  return (
    <HudPanel className="mx-3 mt-3">
      <HudSection
        title={t("panelTitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void approve()} disabled={review.isPending}>
              {t("approve")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)} disabled={review.isPending}>
              {t("returnWithNote")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-hud-muted">{t("panelHint")}</p>
      </HudSection>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        size="sm"
        hud
        title={t("returnWithNote")}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form={FORM_ID} disabled={review.isPending || !note.trim()}>
              {t("return")}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={(e) => void sendBack(e)}>
          <Textarea required maxLength={1000} rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} />
        </form>
      </ResponsiveDialog>
    </HudPanel>
  );
}
