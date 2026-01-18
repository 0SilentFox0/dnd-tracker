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
  onClearAll?: () => void;
  onRemoveSelectedSkill?: () => void;
  selectedSkillForRemoval?: {
    skillName: string;
  } | null;
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
  onClearAll,
  onRemoveSelectedSkill,
  selectedSkillForRemoval,
  isSaving = false,
}: SkillTreeHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <label className="text-sm font-medium whitespace-nowrap">Раса:</label>
          <Select value={selectedRace} onValueChange={onRaceChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isDMMode && hasUnsavedChanges && onSave && (
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="whitespace-nowrap text-xs sm:text-sm"
              size="sm"
            >
              {isSaving ? "Збереження..." : "Зберегти"}
            </Button>
          )}
          {isDMMode && onRemoveSelectedSkill && (
            <Button
              onClick={onRemoveSelectedSkill}
              variant="destructive"
              disabled={!selectedSkillForRemoval}
              className="whitespace-nowrap text-xs sm:text-sm"
              size="sm"
            >
              {selectedSkillForRemoval
                ? `Видалити "${selectedSkillForRemoval.skillName}"`
                : "Видалити скіл"}
            </Button>
          )}
          {isDMMode && onClearAll && (
            <Button
              onClick={onClearAll}
              variant="destructive"
              className="whitespace-nowrap text-xs sm:text-sm"
              size="sm"
            >
              Очистити все
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Label
          htmlFor="dm-mode"
          className="text-sm font-medium cursor-pointer whitespace-nowrap"
        >
          {isDMMode ? "DM" : "Player"}
        </Label>
        <button
          id="dm-mode"
          type="button"
          onClick={onDMModeToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
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
