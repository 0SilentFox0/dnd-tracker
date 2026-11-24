import {
    Brain,
    Diamond,
    Eye,
    Flame,
    Footprints,
    HeartPulse,
    LogOut,
    Moon,
    ScanEye,
    ScrollText,
    Settings2,
    Skull,
    UsersRound,
    Wrench,
} from 'lucide-react';

import {
    BackpackIcon,
    CheckeredFlagIcon,
    ChecklistIcon,
    CrossedSwordsIcon,
    FastForwardIcon,
    HourglassIcon,
    MagicSwirlIcon,
    MuscleUpIcon,
    PowerLightningIcon,
    RicochetIcon,
    ShieldReflectIcon,
    SpellBookIcon,
} from './game';
import { ReactionIcon } from './ReactionIcon';
import { StrikeReturnIcon } from './StrikeReturnIcon';

export { ReactionIcon, StrikeReturnIcon };

export const actionIcon = {
    actions: CrossedSwordsIcon,
    attack: CrossedSwordsIcon,
    magic: SpellBookIcon,
    channel: MagicSwirlIcon,
    ability: MuscleUpIcon,
    bonus: PowerLightningIcon,
    reaction: ShieldReflectIcon,
    core: ChecklistIcon,
    gear: BackpackIcon,
    strikeAndReturn: RicochetIcon,
    gate: HourglassIcon,
    move: Footprints,
    resource: Diamond,
    endTurn: CheckeredFlagIcon,
    railLog: ScrollText,
    railDm: Settings2,
    railReserve: UsersRound,
    railTools: Wrench,
    railView: Eye,
    railFx: Flame,
    railPlayerView: ScanEye,
    railExit: LogOut,
    nextTurn: FastForwardIcon,
    stateDead: Skull,
    stateUnconscious: Moon,
    stateStable: HeartPulse,
    stateConcentrating: Brain,
} as const;

export type ActionIconKey = keyof typeof actionIcon;
