'use client';

import { useEffect, useRef, useState } from 'react';

import type { FxImpact } from '@/lib/utils/battle/fx';

export interface HpChange {
    delta: number;
    hp: number;
    id: number;
    impact: FxImpact | null;
}

/** Вплив фіксується в момент зміни HP: пізніші дії не перезапускають спалах/рамку цього удару. Для цілей із відром HP число береться з `impact.delta` сервера, а удар без зміни відра теж дає зміну. */
export function useHpChange(
    hp: number,
    impact: FxImpact | null = null
): HpChange | null {
    const reported =
        impact?.delta !== undefined && impact.actionId
            ? impact.actionId
            : null;

    const [prev, setPrev] = useState(hp);

    const [seen, setSeen] = useState(reported);

    const [change, setChange] = useState<HpChange | null>(null);

    const fresh = reported !== null && reported !== seen;

    if (hp !== prev || fresh) {
        setPrev(hp);
        setSeen(reported);
        setChange({
            delta: fresh && impact ? (impact.delta ?? 0) : hp - prev,
            hp,
            id: (change?.id ?? 0) + 1,
            impact,
        });
    }

    return change;
}

const SHAKE = [
    { transform: 'none' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(5px)' },
    { transform: 'translateX(-3px)' },
    { transform: 'none' },
];

/** Тремтіння без перемонтування піддерева: Web Animations перезапускається на кожну втрату HP. */
export function useDamageShake<T extends HTMLElement>(change: HpChange | null) {
    const ref = useRef<T>(null);

    const id = change && change.delta < 0 ? change.id : null;

    useEffect(() => {
        if (id !== null) ref.current?.animate?.(SHAKE, { duration: 350 });
    }, [id]);

    return ref;
}
