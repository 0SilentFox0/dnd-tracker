import type { SectionBinding, SystemBinding } from "@/lib/utils/characters/form/bindings";
import { type Characteristics, readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";

export const wfrpBinding = ({ data, update }: SystemBinding): SectionBinding<Characteristics> => ({
  data: readCharacteristics({ characteristics: data }),
  set: (key, value) => update((prev) => ({ ...readCharacteristics({ characteristics: prev }), [key]: value })),
});
