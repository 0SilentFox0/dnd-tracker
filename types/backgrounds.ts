import type { DndSkill } from "@/lib/constants/skills";
import type { Choice, Picks } from "@/types/choices";

export interface BackgroundData {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  choices: Choice[];
  skillProficiencies: DndSkill[];
  toolProficiencies: string[];
  originFeatId: string | null;
  equipmentText: string | null;
}

export interface BackgroundSelection {
  backgroundId: string | null;
  backgroundChoices: Picks;
  backgroundFeatPicks: Picks;
}

export type BackgroundFormData = Omit<BackgroundData, "id">;
