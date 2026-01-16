"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SkillTreeHeaderProps {
  selectedRace: string;
  races: string[];
  isDMMode: boolean;
  hasUnsavedChanges: boolean;
  onRaceChange: (race: string) => void;
  onDMModeToggle: () => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export function SkillTreeHeader({
  selectedRace,
  races,
  isDMMode,
  hasUnsavedChanges,
  onRaceChange,
  onDMModeToggle,
  onSave,
  isSaving = false,
}: SkillTreeHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Раса:</label>
        <Select value={selectedRace} onValueChange={onRaceChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Виберіть расу" />
          </SelectTrigger>
          <SelectContent>
            {races.map((race) => (
              <SelectItem key={race} value={race}>
                {race}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3 mt-4 md:mt-0">
        {isDMMode && hasUnsavedChanges && onSave && (
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="whitespace-nowrap"
          >
            {isSaving ? "Збереження..." : "Зберегти"}
          </Button>
        )}
        <Label htmlFor="dm-mode" className="text-sm font-medium cursor-pointer">
          {isDMMode ? "DM" : "Player"}
        </Label>
        <button
          id="dm-mode"
          type="button"
          onClick={onDMModeToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isDMMode ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isDMMode ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
