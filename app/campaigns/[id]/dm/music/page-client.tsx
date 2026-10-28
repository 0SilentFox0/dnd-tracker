"use client";

import { useState } from "react";
import { Music, Plus } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { AddYoutubeTrackDialog } from "@/components/music/AddYoutubeTrackDialog";
import { EditTrackDialog } from "@/components/music/EditTrackDialog";
import { TrackGroups } from "@/components/music/TrackGroups";
import { UploadTrackButton } from "@/components/music/UploadTrackButton";
import { Button } from "@/components/ui/button";
import { MAX_TRACK_MB, MAX_TRACKS_PER_CAMPAIGN, TRACK_FORMATS_LABEL } from "@/lib/constants/music";
import { useMusicLibrary } from "@/lib/hooks/music";
import { listGroupPrefixes } from "@/lib/utils/audio/playlist-groups";
import type { CampaignTrack } from "@/types/audio";

export function DMMusicPageClient({ campaignId, initialTracks }: { campaignId: string; initialTracks: CampaignTrack[] }) {
  const library = useMusicLibrary(campaignId, initialTracks);

  const [youtubeOpen, setYoutubeOpen] = useState(false);

  const [editing, setEditing] = useState<CampaignTrack | null>(null);

  const full = library.tracks.length >= MAX_TRACKS_PER_CAMPAIGN;

  return (
    <HudPage>
      <HudPageHeader
        title="Музика"
        subtitle={`${library.tracks.length} з ${MAX_TRACKS_PER_CAMPAIGN} треків · ${TRACK_FORMATS_LABEL} до ${MAX_TRACK_MB} МБ`}
        actions={
          <>
            <UploadTrackButton onFile={(file) => void library.upload(file)} pending={library.isBusy || full} />
            <Button variant="outline" onClick={() => setYoutubeOpen(true)} disabled={full} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              YouTube
            </Button>
          </>
        }
      />
      {library.isLoading && library.tracks.length === 0 ? (
        <LoadingState rows={4} label="Завантаження треків…" />
      ) : library.tracks.length === 0 ? (
        <EmptyState icon={Music} title="Ще немає треків" description={`Завантажте ${TRACK_FORMATS_LABEL} або додайте посилання YouTube — ДМ вмикає їх у бою.`} />
      ) : (
        <TrackGroups tracks={library.tracks} busy={library.isBusy} actions={{ onRename: library.rename, onEdit: setEditing, onDelete: (t) => void library.remove(t), onMove: library.move }} />
      )}
      <EditTrackDialog track={editing} onClose={() => setEditing(null)} onSave={library.update} pending={library.isBusy} groups={listGroupPrefixes(library.tracks)} />
      <AddYoutubeTrackDialog open={youtubeOpen} onOpenChange={setYoutubeOpen} onSubmit={library.addYoutube} pending={library.isBusy} />
    </HudPage>
  );
}
