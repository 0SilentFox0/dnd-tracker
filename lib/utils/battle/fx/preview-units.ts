// kept apart from spell-preview so client code can import the arena roster without the battle engine
export type PreviewUnitId = "caster" | "ally" | "fallen" | "e1" | "e2";

export interface PreviewUnit {
  id: PreviewUnitId;
  name: string;
  side: "ally" | "enemy";
}

export const PREVIEW_UNITS: readonly PreviewUnit[] = [
  { id: "caster", name: "Sorceress", side: "ally" },
  { id: "ally", name: "Warrior", side: "ally" },
  { id: "fallen", name: "Fallen", side: "ally" },
  { id: "e1", name: "Ogre", side: "enemy" },
  { id: "e2", name: "Lich", side: "enemy" },
];
