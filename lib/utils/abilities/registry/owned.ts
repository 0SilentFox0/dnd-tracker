import { type Composition } from "@/lib/utils/rules/systems/catalog";
import { compositionOrder } from "@/lib/utils/rules/systems/compose";

export interface Owned<T> {
  system: string;
  items: T;
}

/** Items of the active owners: base first, then modules in composition order. */
export function ownedIn<T>(list: readonly Owned<T>[], c: Composition): T[] {
  return [c.base, ...compositionOrder(c.base, c.modules)].flatMap((id) => list.filter((o) => o.system === id).map((o) => o.items));
}
