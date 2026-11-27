'use client';

import { useCallback, useEffect, useRef } from 'react';

import {
    type AttackIntent,
    participantAttackIntent,
    type ParticipantClickScene,
} from '@/lib/utils/battle/flows';
import type { LogLine } from '@/types/text';

export interface ParticipantClickInput extends ParticipantClickScene {
    select(id: string | null): void;
    requestAttack(intent: AttackIntent): void;
    notify(reason: LogLine): void;
}

export function useParticipantClick(
    input: ParticipantClickInput | null
): (id: string) => void {
    const latest = useRef(input);

    useEffect(() => {
        latest.current = input;
    });

    return useCallback((id: string) => {
        const l = latest.current;

        if (!l) return;

        const res = participantAttackIntent(l, id);

        if (!res) l.select(id);
        else if ('intent' in res) l.requestAttack(res.intent);
        else {
            l.select(id);
            l.notify(res.reason);
        }
    }, []);
}
