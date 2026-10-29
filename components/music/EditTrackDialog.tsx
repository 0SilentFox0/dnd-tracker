"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import { buildTrackPatch, trackToDraft } from "@/lib/utils/audio/track-edit";
import { trackLink } from "@/lib/utils/audio/track-link";
import type { CampaignTrack, UpdateTrackData } from "@/types/audio";

const FORM_ID = "edit-track";

const GROUPS_ID = "edit-track-groups";

export interface EditTrackDialogProps {
  track: CampaignTrack | null;
  onClose(): void;
  onSave(id: string, patch: UpdateTrackData): Promise<boolean>;
  pending: boolean;
  groups: string[];
}

function EditTrackForm({ track, onClose, onSave, pending, groups }: EditTrackDialogProps & { track: CampaignTrack }) {
  const t = useTranslator();

  const tr = useTranslations();

  const other = tr("music.groups.other");

  const battle = tr("music.groups.battle");

  const [draft, setDraft] = useState(() => trackToDraft(track));

  const built = buildTrackPatch(track, draft);

  return (
    <ResponsiveDialog
      hud
      open
      onOpenChange={(open) => !open && onClose()}
      title={tr("music.edit.title")}
      description={track.title}
      footer={
        <Button type="submit" form={FORM_ID} disabled={!built.ok || pending}>
          {tr("common.actions.save")}
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();

          if (built.ok && (Object.keys(built.patch).length === 0 || (await onSave(track.id, built.patch)))) onClose();
        }}
      >
        <label className="flex flex-col gap-1 text-xs text-hud-muted">
          {tr("music.edit.group")}
          <Input aria-label={tr("music.edit.group")} list={GROUPS_ID} placeholder={other} maxLength={TRACK_TITLE_MAX} value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} />
          <datalist id={GROUPS_ID}>
            {groups.map((g) => <option key={g} value={g} />)}
          </datalist>
          <span>{tr("music.edit.groupHint", { other, battle })}</span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-hud-muted">
          {tr("music.edit.name")}
          <Input aria-label={tr("music.edit.name")} maxLength={TRACK_TITLE_MAX} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          {!built.ok && built.error.title && <span className="text-[var(--enemy)]">{translateIssue(t, { message: built.error.title })}</span>}
        </label>
        <label className="flex flex-col gap-1 text-xs text-hud-muted">
          {tr("music.edit.link")}
          {track.kind === "youtube" ? (
            <Input aria-label={tr("music.edit.link")} value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          ) : (
            <Input aria-label={tr("music.edit.link")} value={trackLink(track) ?? ""} readOnly />
          )}
          {!built.ok && built.error.url && <span className="text-[var(--enemy)]">{translateIssue(t, { message: built.error.url })}</span>}
        </label>
        <label className="flex flex-col gap-1 text-xs text-hud-muted">
          {tr("music.edit.duration")}
          <Input aria-label={tr("music.edit.duration")} inputMode="numeric" value={draft.durationSec} onChange={(e) => setDraft({ ...draft, durationSec: e.target.value })} />
          {!built.ok && built.error.durationSec && <span className="text-[var(--enemy)]">{translateIssue(t, { message: built.error.durationSec })}</span>}
        </label>
      </form>
    </ResponsiveDialog>
  );
}

export function EditTrackDialog(props: EditTrackDialogProps) {
  return props.track && <EditTrackForm key={props.track.id} {...props} track={props.track} />;
}
