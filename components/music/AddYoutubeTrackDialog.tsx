"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";

const FORM_ID = "add-youtube-track";

export function AddYoutubeTrackDialog({ open, onOpenChange, onSubmit, pending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { url: string; title?: string }) => Promise<boolean>;
  pending: boolean;
}) {
  const t = useTranslations();

  const [url, setUrl] = useState("");

  const [title, setTitle] = useState("");

  const valid = parseYoutubeId(url) !== null;

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={t("music.youtube.title")}
      description={t("music.youtube.description")}
      footer={
        <Button type="submit" form={FORM_ID} disabled={!valid || pending}>
          {t("common.actions.add")}
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();

          if (await onSubmit({ url: url.trim(), ...(title.trim() && { title: title.trim() }) })) {
            setUrl("");
            setTitle("");
            onOpenChange(false);
          }
        }}
      >
        <Input aria-label={t("music.youtube.urlLabel")} placeholder="https://youtu.be/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        {url && !valid && <p className="text-xs text-[var(--enemy)]">{t("music.youtube.urlInvalid")}</p>}
        <Input aria-label={t("music.youtube.titleLabel")} placeholder={t("music.youtube.titlePlaceholder")} maxLength={TRACK_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
