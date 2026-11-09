import type { CorruptionState, GrantSummary } from "@/lib/utils/rules/systems";

export type CorruptionGrantBody = { points: number; reason: string };

export type CorruptionUndoBody = { grantId: string };

export type CorruptionGrantResult = { grantId: string; corruption: CorruptionState; summary: GrantSummary };

export type CorruptionUndoResult = { corruption: CorruptionState };
