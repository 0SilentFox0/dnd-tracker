import type { ConditionUsage } from "@/types/campaigns";

export const isConditionUsed = (usage: ConditionUsage) => Object.values(usage).some((list) => list.length > 0);
