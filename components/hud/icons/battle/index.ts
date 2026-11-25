import { Footprints } from 'lucide-react';

import {
    BackpackIcon,
    ChecklistIcon,
    CrossedSwordsIcon,
    FastForwardIcon,
    HourglassIcon,
    MagicSwirlIcon,
    MuscleUpIcon,
    PowerLightningIcon,
    RicochetIcon,
    SpellBookIcon,
} from './game';
import {
    RailDmIcon,
    RailLogIcon,
    RailReserveIcon,
    RailToolsIcon,
} from './rail';

export const actionIcon = {
    actions: CrossedSwordsIcon,
    attack: CrossedSwordsIcon,
    magic: SpellBookIcon,
    channel: MagicSwirlIcon,
    ability: MuscleUpIcon,
    bonus: PowerLightningIcon,
    gate: HourglassIcon,
    core: ChecklistIcon,
    gear: BackpackIcon,
    strikeAndReturn: RicochetIcon,
    move: Footprints,
    railLog: RailLogIcon,
    railDm: RailDmIcon,
    railReserve: RailReserveIcon,
    railTools: RailToolsIcon,
    nextTurn: FastForwardIcon,
} as const;

export type ActionIconKey = keyof typeof actionIcon;
