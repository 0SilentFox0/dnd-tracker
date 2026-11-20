import type { SystemOpBody } from '@/lib/api/battle-ops';

export interface ConditionTestBody {
    participantId: string;
    condition: string;
    roll?: number;
    serverRoll?: boolean;
}

export const conditionTestOp = (body: ConditionTestBody): SystemOpBody => ({
    action: 'condition-test',
    body,
});

export const fateReactionOp = (
    answers: Record<string, boolean>
): SystemOpBody => ({
    action: 'fate-reaction',
    body: { answers },
});

export const fortuneConditionOp = (
    participantId: string,
    condition: string
): SystemOpBody => ({
    action: 'fortune-condition',
    body: { participantId, condition },
});

export type MomentumBody =
    | { mode: 'secondAttack'; participantId: string }
    | {
          mode: 'leadership';
          participantId: string;
          allyId: string;
          roll?: number;
          serverRoll?: boolean;
      };

export const momentumOp = (body: MomentumBody): SystemOpBody => ({
    action: 'momentum',
    body,
});

export const disengageOp = (body: {
    participantId: string;
    roll?: number;
    serverRoll?: boolean;
}): SystemOpBody => ({
    action: 'disengage',
    body,
});

export type MovementOpBody =
    | { kind: 'run'; participantId: string }
    | {
          kind: 'sprint';
          participantId: string;
          roll?: number;
          serverRoll?: boolean;
      }
    | { kind: 'charge'; participantId: string; targetId: string };

export const movementOp = (body: MovementOpBody): SystemOpBody => ({
    action: 'movement',
    body,
});

export interface DispelBody {
    participantId: string;
    targetId: string;
    mode: 'persistent';
    roll?: number;
    serverRoll?: boolean;
}

export const dispelOp = (body: DispelBody): SystemOpBody => ({
    action: 'dispel',
    body,
});

export const malignantOp = (
    participantId: string,
    on: boolean
): SystemOpBody => ({
    action: 'malignant',
    body: { participantId, on },
});

export const frenzyOp = (body: {
    participantId: string;
    roll?: number;
    serverRoll?: boolean;
}): SystemOpBody => ({
    action: 'frenzy',
    body,
});

export const intimidateOp = (body: {
    participantId: string;
    targetId: string;
    roll?: number;
    serverRoll?: boolean;
}): SystemOpBody => ({
    action: 'intimidate',
    body,
});

export const passionOp = (body: {
    participantId: string;
    mode: 'vent' | 'release';
    key?: string;
}): SystemOpBody => ({
    action: 'passion',
    body,
});

export const aimOp = (body: {
    participantId: string;
    targetId: string;
}): SystemOpBody => ({
    action: 'aim',
    body,
});

export const defensiveOp = (body: {
    participantId: string;
    skill: 'parry' | 'dodge' | 'magick';
}): SystemOpBody => ({
    action: 'defensive',
    body,
});

export const fleeOp = (participantId: string): SystemOpBody => ({
    action: 'flee',
    body: { participantId },
});

export const grappleOp = (body: {
    participantId: string;
    choice: 'damage' | 'entangle' | 'free';
    roll?: number;
    serverRoll?: boolean;
}): SystemOpBody => ({
    action: 'grapple',
    body,
});

export const mountedOp = (
    participantId: string,
    mountId?: string
): SystemOpBody => ({
    action: 'mounted',
    body: { participantId, ...(mountId && { mountId }) },
});
