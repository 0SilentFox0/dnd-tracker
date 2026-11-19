import { it } from 'vitest';

import { EDITION_PROFILES } from '@/systems/wfrp/rules/edition/profiles';

/** The 5e edition profile every canon test runs under. */
export const CANON = EDITION_PROFILES.canon5e;

export const LEGACY = EDITION_PROFILES.legacy;

/** A test built on a worked example (or rule) of the book; the title carries the book page (+-1 against the printed one). */
export const bookExample = (page: number, title: string, run: () => void) =>
    it(`[p${page}] ${title}`, run);

export const NO_RNG = () => 0;
