"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";

const FORM_ID = "add-youtube-track";

export function AddYoutubeTrackDialog({ open, onOpenChange, onSubmit, pending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { url: string; title?: string }) => Promise<boolean>;
  pending: boolean;
}) {
  const [url, setUrl] = useState("");

  const [title, setTitle] = useState("");

  const valid = parseYoutubeId(url) !== null;

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Додати з YouTube"
      description="Посилання youtu.be, watch?v= або shorts. Назву можна не вводити — візьмемо з YouTube."
      footer={
        <Button type="submit" form={FORM_ID} disabled={!valid || pending}>
          Додати
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
        <Input aria-label="Посилання YouTube" placeholder="https://youtu.be/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        {url && !valid && <p className="text-xs text-[var(--enemy)]">Не вдалося розпізнати посилання YouTube</p>}
        <Input aria-label="Назва (необовʼязково)" placeholder="Назва" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
