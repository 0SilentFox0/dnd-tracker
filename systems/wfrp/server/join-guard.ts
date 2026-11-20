import { API_ERRORS } from '@/lib/constants/api-errors';
import type { CharacterJoinGuard } from '@/lib/server/systems/types';
import { isRecord } from '@/lib/utils/common/is-record';
import { readCorruption } from '@/systems/wfrp/rules/corruption/read';

export const soulLostGuard: CharacterJoinGuard = ({ characteristics }) =>
    isRecord(characteristics) &&
    readCorruption(characteristics.corruption)?.soulLost
        ? API_ERRORS.BATTLE_CHARACTER_SOUL_LOST
        : undefined;
