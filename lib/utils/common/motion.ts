import type { CSSProperties } from 'react';

/** Stagger slot for `.motion-rise`: delay = slot * --motion-stagger. */
export const stagger = (slot: number): CSSProperties =>
    ({ '--i': slot }) as CSSProperties;
