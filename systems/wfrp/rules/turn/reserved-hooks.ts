import type {
    TurnHook,
    TurnHookCtx,
    TurnStartCtx,
    TurnSubjectCtx,
} from '@/lib/utils/rules/systems/types';

const unchanged = (ctx: { participants: TurnHookCtx['participants'] }) => ({
    participants: ctx.participants,
    messages: [],
});

export const wfrpSwarmRoundEnd: TurnHook<TurnSubjectCtx> = unchanged;

export const wfrpRegenerate: TurnHook<TurnStartCtx> = unchanged;
