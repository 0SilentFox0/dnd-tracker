"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import { BATTLE_TRACK_GROUP, OTHER_TRACK_GROUP } from "@/lib/utils/audio/playlist-groups";
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
  const [draft, setDraft] = useState(() => trackToDraft(track));

  const built = buildTrackPatch(track, draft);

  return (
    <ResponsiveDialog
      hud
      open
      onOpenChange={(open) => !open && onClose()}
      title="Редагувати трек"
      description={track.title}
      footer={
        <Button type="submit" form={FORM_ID} disabled={!built.ok || pending}>
          Зберегти
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
          Група
          <Input aria-label="Група" list={GROUPS_ID} placeholder={OTHER_TRACK_GROUP} maxLength={TRACK_TITLE_MAX} value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} />
          <datalist id={GROUPS_ID}>
            {groups.map((g) => <option key={g} value={g} />)}
          </datalist>
          <span>Оберіть наявну або введіть нову. Порожня — «{OTHER_TRACK_GROUP}». Усі «Раса - Битва N» показуються в групі «{BATTLE_TRACK_GROUP}».</span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-hud-muted">
          Назва
          <Input aria-label="Назва" maxLength={TRACK_TITLE_MAX} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          {!built.ok && built.error.title && <span className="text-[var(--enemy)]">{built.error.title}</span>}
        </label>
        <label className="flex flex-col gap-1 text-xs text-hud-muted">
          Посилання
          {track.kind === "youtube" ? (
            <Input aria-label="Посилання" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          ) : (
            <Input aria-label="Посилання" value={trackLink(track) ?? ""} readOnly />
          )}
          {!built.ok && built.error.url && <span className="text-[var(--enemy)]">{built.error.url}</span>}
        </label>
        <label className="flex flex-col gap-1 text-xs text-hud-muted">
          Тривалість, с
          <Input aria-label="Тривалість, с" inputMode="numeric" value={draft.durationSec} onChange={(e) => setDraft({ ...draft, durationSec: e.target.value })} />
          {!built.ok && built.error.durationSec && <span className="text-[var(--enemy)]">{built.error.durationSec}</span>}
        </label>
      </form>
    </ResponsiveDialog>
  );
}

export function EditTrackDialog(props: EditTrackDialogProps) {
  return props.track && <EditTrackForm key={props.track.id} {...props} track={props.track} />;
}
