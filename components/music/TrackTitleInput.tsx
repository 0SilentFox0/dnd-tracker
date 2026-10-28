"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import { cn } from "@/lib/utils";
import { normalizeTrackTitle } from "@/lib/utils/audio/track-title";
import type { CampaignTrack } from "@/types/audio";

/**
 * Поле назви треку: Enter/blur зберігає. Без onClose — завжди поле (бібліотека);
 * з onClose — режим «олівець → поле»: Esc скасовує, і поле закривається після будь-якого завершення.
 */
export function TrackTitleInput({ track, onRename, onClose, className }: { track: Pick<CampaignTrack, "title">; onRename(title: string): void; onClose?(): void; className?: string }) {
  const t = useTranslations("music");

  // Esc знімає поле з фокусу, і blur не мусить зберегти скасовану назву
  const settled = useRef(false);

  const finish = (input: HTMLInputElement, raw: string | null) => {
    if (settled.current) return;

    const title = normalizeTrackTitle(raw, track.title);

    if (title) onRename(title);

    if (onClose) {
      settled.current = true;
      onClose();
    } else if (!title) {
      input.value = track.title;
    }
  };

  return (
    <Input
      aria-label={onClose ? t("list.titleNewName") : t("list.titleName")}
      autoFocus={!!onClose}
      defaultValue={track.title}
      maxLength={TRACK_TITLE_MAX}
      onBlur={(e) => finish(e.currentTarget, e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (onClose) finish(e.currentTarget, e.currentTarget.value);
          else e.currentTarget.blur();
        }

        if (e.key === "Escape" && onClose) finish(e.currentTarget, null);
      }}
      className={cn("h-8 min-w-0 flex-1", className)}
    />
  );
}
