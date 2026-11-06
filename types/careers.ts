import type { CareerTierDef } from "@/lib/utils/rules/systems";

export type { CareerTierDef };

export interface CareerData {
  id: string;
  name: string;
  icon: string | null;
  class: string | null;
  tiers: CareerTierDef[];
}

export type CareerFormData = Omit<CareerData, "id">;
