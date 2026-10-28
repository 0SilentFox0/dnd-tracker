import type { Condition } from "./conditions";

/** Спорядження в бою не змінюється, тож така умова дозволена й на запечених статах. */
export function isStaticCondition(c: Condition): boolean {
  switch (c.type) {
    case "armorWorn":
      return true;
    case "not":
      return isStaticCondition(c.condition);
    case "all":
    case "any":
      return c.conditions.every(isStaticCondition);
    default:
      return false;
  }
}
