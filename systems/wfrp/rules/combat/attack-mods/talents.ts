import { mountedMods } from '../mounted';
import type { AttackModSource } from './types';

export const talentMods: AttackModSource = (c) => mountedMods(c);
