import { bonus } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';

export const corruptionThreshold = (c: Characteristics) =>
    bonus(c, 't') + bonus(c, 'wp');
