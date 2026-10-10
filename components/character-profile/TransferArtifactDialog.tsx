"use client";

import { useProfile } from "./ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCharacterRoster, useTransferArtifact } from "@/lib/hooks/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { SheetArtifact } from "@/types/characters";

interface TransferArtifactDialogProps {
  artifact: SheetArtifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferArtifactDialog({ artifact, open, onOpenChange }: TransferArtifactDialogProps) {
  const { campaignId, characterId } = useProfile();

  const roster = useCharacterRoster(campaignId);

  const transfer = useTransferArtifact(campaignId, characterId);

  const confirm = useConfirm();

  const notify = useNotify();

  const recipients = (roster.data ?? []).filter((h) => h.id !== characterId);

  const give = (heroId: string, heroName: string) => {
    if (!artifact) return;

    void confirm({
      title: `Передати «${artifact.name}» герою ${heroName}?`,
      confirmLabel: "Передати",
      onConfirm: () =>
        transfer.mutateAsync({ slot: artifact.slot, toCharacterId: heroId }).then(
          () => onOpenChange(false),
          (e: Error) => notify(e.message || "Не вдалося передати артефакт"),
        ),
    });
  };

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={artifact ? `Передати: ${artifact.name}` : "Передати"}>
      {roster.isLoading ? (
        <LoadingState rows={3} label="Завантаження героїв…" />
      ) : recipients.length === 0 ? (
        <EmptyState title="Немає інших героїв у кампанії" />
      ) : (
        <ul>
          {recipients.map((h) => {
            const swap = artifact ? h.equipped[artifact.slot] : undefined;

            return (
              <li key={h.id}>
                <button type="button" disabled={transfer.isPending} onClick={() => give(h.id, h.name)} className="flex min-h-11 w-full items-center gap-3 border-b border-[#2a2218] py-2 text-left disabled:opacity-50">
                  <EntityIcon src={h.avatar} name={h.name} size={36} className="size-9 rounded-full" />
                  <span className="min-w-0">
                    <span className="block text-sm text-hud-ink">{h.name}</span>
                    {swap && <span className="block text-xs text-hud-muted">обмін на {swap.name}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
