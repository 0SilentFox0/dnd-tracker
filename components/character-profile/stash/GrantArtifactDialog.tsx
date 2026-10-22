"use client";

import { useProfile } from "../ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { EmptyState } from "@/components/common/states";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { artifactSlotLabel } from "@/lib/constants/artifacts";
import { useStashAction } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import type { StashArtifact } from "@/types/inventory";

interface GrantArtifactDialogProps {
  artifacts: StashArtifact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrantArtifactDialog({ artifacts, open, onOpenChange }: GrantArtifactDialogProps) {
  const { campaignId, characterId } = useProfile();

  const action = useStashAction(campaignId, characterId);

  const notify = useNotify();

  const grant = (artifactId: string) =>
    action.mutateAsync({ action: "grant", artifactId }).then(
      () => onOpenChange(false),
      (e: Error) => notify(e.message || "Не вдалося видати артефакт"),
    );

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title="Видати артефакт">
      {artifacts.length === 0 ? (
        <EmptyState title="Немає вільних артефактів" />
      ) : (
        <ul>
          {artifacts.map((a) => (
            <li key={a.id}>
              <button type="button" disabled={action.isPending} onClick={() => void grant(a.id)} className="flex min-h-11 w-full items-center gap-3 border-b border-[#2a2218] py-2 text-left disabled:opacity-50">
                <EntityIcon src={a.icon} name={a.name} size={36} className="hud-sc size-9 rounded-md border border-hud-line bg-transparent text-inherit" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-hud-ink">{a.name}</span>
                  <span className="block text-xs text-hud-muted">{artifactSlotLabel(a.slot)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
