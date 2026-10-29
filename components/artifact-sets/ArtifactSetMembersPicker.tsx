"use client";

import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ARTIFACT_SLOT_VALUES, type ArtifactSlot } from "@/lib/constants/artifacts";
import type { ArtifactListItem } from "@/types/artifacts";

export interface ArtifactSetMembersPickerProps {
  artifacts: ArtifactListItem[];
  selectedIds: Set<string>;
  onToggle: (artifactId: string) => void;
}

export function ArtifactSetMembersPicker({
  artifacts,
  selectedIds,
  onToggle,
}: ArtifactSetMembersPickerProps) {
  const t = useTranslations("artifacts");

  return (
    <HudSection title={t("sets.members.title")} className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t("sets.members.hint")}
      </p>
      <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
        {artifacts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {t("sets.members.empty")}
          </p>
        ) : (
          artifacts.map((a) => (
            <label
              key={a.id}
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
            >
              <Checkbox
                checked={selectedIds.has(a.id)}
                onCheckedChange={() => onToggle(a.id)}
              />
              <span className="flex-1 text-sm">
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {(ARTIFACT_SLOT_VALUES as readonly string[]).includes(a.slot) ? t(`slots.${a.slot as ArtifactSlot}`) : a.slot}
                </span>
              </span>
            </label>
          ))
        )}
      </div>
    </HudSection>
  );
}
