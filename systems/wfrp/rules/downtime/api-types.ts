import type { Ailment, DowntimeState, Endeavour } from "@/systems/wfrp/rules/downtime/types";
import type { CharacterResources } from "@/types/characters";
import type { Purse } from "@/types/inventory";

export type DowntimeSetBody = { endeavour: Endeavour | null; ailments?: (Omit<Ailment, "id"> & { id?: string })[] };

export type DowntimePeriodBody = { days: number; characterIds: string[] };

export type DowntimePeriodUndoBody = { periodId: string; characterIds: string[] };

export type DowntimeSetResult = { downtime: DowntimeState };

export type DowntimePeriodResult = { periodId: string; characters: { id: string; resources: CharacterResources; downtime: DowntimeState; purse?: Purse }[] };
