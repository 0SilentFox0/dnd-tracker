import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '../characteristics/keys';
import type { WfrpParticipantStats } from '../combat/participant';
import {
    ACTION_SLOT,
    PARTICIPANT_SLOT,
    SCENE_SLOT,
    type SceneMomentum,
} from '../slots';

import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';

const NO_AP = { head: 0, arm: 0, body: 0, leg: 0 };

export const slotOf = (
    characteristics: Characteristics = DEFAULT_CHARACTERISTICS,
    stats: Partial<WfrpParticipantStats> = {}
): SystemSlot =>
    PARTICIPANT_SLOT.write({
        characteristics,
        stats: { sb: 0, tb: 0, ag: 0, ap: NO_AP, ...stats },
    });

export const withStats = <T extends BattleParticipant>(
    p: T,
    patch: Partial<WfrpParticipantStats>
): T => {
    const slot = PARTICIPANT_SLOT.read(p.abilities.system);

    return {
        ...p,
        abilities: {
            ...p.abilities,
            system: slotOf(slot?.characteristics, { ...slot?.stats, ...patch }),
        },
    };
};

export const slotStats = (slot: SystemSlot | undefined) =>
    PARTICIPANT_SLOT.read(slot)?.stats;

export const slotChars = (slot: SystemSlot | undefined) =>
    PARTICIPANT_SLOT.read(slot)?.characteristics;

export const attackOf = (src: { system?: SystemSlot } | undefined) =>
    ACTION_SLOT.read(src?.system)?.attack;

export const castOf = (src: { system?: SystemSlot } | undefined) =>
    ACTION_SLOT.read(src?.system)?.cast;

export const sceneOf = (m: SceneMomentum): SystemSlot => SCENE_SLOT.write(m);

export const momentumOf = (slot: SystemSlot | undefined): SceneMomentum =>
    SCENE_SLOT.read(slot) ?? {};
