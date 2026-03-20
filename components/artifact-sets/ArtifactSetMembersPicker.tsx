"use client";

import { formatArtifactSlotLabel } from "./artifact-set-form-helpers";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ArtifactListItem } from "@/lib/api/artifacts";

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
  return (
    <div className="space-y-3">
      <Label>Артефакти в сеті</Label>
      <p className="text-xs text-muted-foreground">
        Бонус спрацьовує лише якщо персонаж екіпірував усі обрані тут предмети.
        Доступні лише артефакти без іншого сету або вже з цього сету.
      </p>
      <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
        {artifacts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Немає доступних артефактів. Створіть артефакти в розділі «Артефакти».
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
                  — {formatArtifactSlotLabel(a.slot)}
                </span>
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
