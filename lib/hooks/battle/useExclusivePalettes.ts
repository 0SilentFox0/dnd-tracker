'use client';

import { useEffect, useRef } from 'react';

import {
    PALETTE_KEYS,
    type PaletteKey,
    type PaletteState,
    palettesToClose,
} from './modes/palettes';

type PaletteTools = Record<PaletteKey, { active: boolean; close?: () => void }>;

const stateOf = (tools: PaletteTools): PaletteState =>
    Object.fromEntries(
        PALETTE_KEYS.map((k) => [k, tools[k].active])
    ) as PaletteState;

/** Щойно відкрита палітра (режиму, місцевості, погоди, руху, фону) закриває решту. */
export function useExclusivePalettes(tools: PaletteTools) {
    const latest = useRef(tools);

    const state = stateOf(tools);

    const signature = PALETTE_KEYS.map((k) => (state[k] ? '1' : '0')).join('');

    const prev = useRef(state);

    useEffect(() => {
        latest.current = tools;
    });

    useEffect(() => {
        const next = stateOf(latest.current);

        for (const key of palettesToClose(prev.current, next))
            latest.current[key].close?.();

        prev.current = next;
    }, [signature]);
}
