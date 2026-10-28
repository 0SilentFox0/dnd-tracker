import type { SkillRadius, SpellChain } from "@/lib/utils/battle/spell/spell-targeting";
import type { GridPoint, SpellTemplate } from "@/types/battle";

export type SpellTargetMode = "none" | "single" | "multi" | "all" | "template";

export interface SpellPick {
  spellId: string;
  level: number;
  targetMode: SpellTargetMode;
  /** кого можна обирати: союзник, ворог або полеглий союзник */
  targetSide?: "ally" | "enemy" | "dead";
  maxTargets?: number;
  template?: SpellTemplate;
  /** дальність у футах */
  range?: number;
  /** шаблон лишає зону: його можна поставити й без цілей */
  zone?: boolean;
  /** одиночне заклинання, розширене вмінням до кількох цілей: на карті — коло лише по своїй стороні */
  skillRadius?: SkillRadius;
  /** ланцюг на карті: гравець обирає першу ціль, решту рахує спільний spellChain */
  chain?: SpellChain;
  needsSaves: boolean;
  needsAttackRolls?: boolean;
  diceSlots: number[];
}

export interface SlotOption {
  key: string;
  label: string;
  castLevel: number;
  left: number;
}

export interface SpellFlowState {
  step: "closed" | "book" | "spell" | "targets" | "rolls" | "summary" | "submitting" | "result";
  casterId?: string;
  level: number;
  levelPinned?: boolean;
  pick?: SpellPick;
  targetIds: string[];
  aim?: GridPoint;
  saves: Record<string, number>;
  attacks: Record<string, number>;
  slotKey?: string;
  grantKey?: string;
  castLevel?: number;
  damage: (number | undefined)[];
  error?: string;
}

export type SpellFlowAction =
  | { type: "OPEN"; casterId: string; level: number; levels?: number[] }
  | { type: "SPELLS_LOADED"; levels: number[] }
  | { type: "SET_LEVEL"; level: number }
  | { type: "PICK"; pick: SpellPick; slotKey?: string; grantKey?: string; castLevel?: number }
  | { type: "SET_SLOT"; slotKey: string; pick: SpellPick }
  | { type: "SET_GRANT"; grantKey: string; pick: SpellPick; castLevel?: number }
  | { type: "SET_CAST_LEVEL"; castLevel: number; pick: SpellPick }
  | { type: "SET_ATTACK"; id: string; value: number | undefined }
  | { type: "TO_TARGETS" }
  | { type: "TOGGLE_TARGET"; id: string }
  | { type: "PICK_TARGET"; id: string }
  | { type: "SET_AIM"; aim: GridPoint; targetIds: string[] }
  | { type: "CONFIRM_TARGETS" }
  | { type: "SET_SAVE"; id: string; value: number | undefined }
  | { type: "SET_DAMAGE"; index: number; value: number | undefined }
  | { type: "TO_SUMMARY" }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS" }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };

export interface SpellWidening {
  /** коротко для рядка списку */
  badge: string;
  /** повністю для деталей заклинання */
  note: string;
}
