import type {
    CorruptionState,
    GrantSummary,
} from '@/systems/wfrp/rules/corruption/types';

export type CorruptionGrantBody = { points: number; reason: string };

export type CorruptionUndoBody = { grantId: string };

export type CorruptionGrantResult = {
    grantId: string;
    corruption: CorruptionState;
    summary: GrantSummary;
};

export type CorruptionUndoResult = { corruption: CorruptionState };
