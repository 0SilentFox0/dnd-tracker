import {
    Footprints,
    ScrollText,
    Settings2,
    UsersRound,
    Wrench,
} from 'lucide-react';

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
    railLog: ScrollText,
    railDm: Settings2,
    railReserve: UsersRound,
    railTools: Wrench,
    nextTurn: FastForwardIcon,
} as const;

export type ActionIconKey = keyof typeof actionIcon;
