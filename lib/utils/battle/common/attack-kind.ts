import { AttackType } from "@/lib/constants/battle";

export function attackKindOf(type: string | undefined | null): AttackType {
  return type === AttackType.RANGED ? AttackType.RANGED : AttackType.MELEE;
}
