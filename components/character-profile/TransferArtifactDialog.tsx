"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "./ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCharacterRoster, useTransferArtifact } from "@/lib/hooks/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";

interface TransferArtifactDialogProps {
  artifact: { id: string; name: string; slot: string } | null;
  source: { slot: string } | { artifactId: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferArtifactDialog({ artifact, source, open, onOpenChange }: TransferArtifactDialogProps) {
  const { campaignId, characterId } = useProfile();

  const t = useTranslations("characterProfile.transfer");

  const roster = useCharacterRoster(campaignId);

  const transfer = useTransferArtifact(campaignId, characterId);

  const confirm = useConfirm();

  const notify = useNotify();

  const recipients = (roster.data ?? []).filter((h) => h.id !== characterId);

  const give = (heroId: string, heroName: string) => {
    if (!artifact) return;

    void confirm({
      title: t("confirm", { artifact: artifact.name, hero: heroName }),
      confirmLabel: t("give"),
      onConfirm: () =>
        transfer.mutateAsync({ ...source, toCharacterId: heroId }).then(
          () => onOpenChange(false),
          (e: Error) => notify(e.message || t("failed")),
        ),
    });
  };

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={artifact ? t("titleFor", { artifact: artifact.name }) : t("give")}>
      {roster.isLoading ? (
        <LoadingState rows={3} label={t("loading")} />
      ) : recipients.length === 0 ? (
        <EmptyState title={t("noHeroes")} />
      ) : (
        <ul>
          {recipients.map((h) => (
              <li key={h.id}>
                <button type="button" disabled={transfer.isPending} onClick={() => give(h.id, h.name)} className="flex min-h-11 w-full items-center gap-3 border-b border-[#2a2218] py-2 text-left disabled:opacity-50">
                  <EntityIcon src={h.avatar} name={h.name} size={36} className="size-9 rounded-full" />
                  <span className="min-w-0">
                    <span className="block text-sm text-hud-ink">{h.name}</span>
                    <span className="block text-xs text-hud-muted">{t("toStash")}</span>
                  </span>
                </button>
              </li>
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
