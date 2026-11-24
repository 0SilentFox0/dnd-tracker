import {
    Backpack,
    BookOpen,
    Brain,
    Diamond,
    Eye,
    Flag,
    Flame,
    Footprints,
    HeartPulse,
    Hourglass,
    ListChecks,
    LogOut,
    Moon,
    ScanEye,
    ScrollText,
    Settings2,
    SkipForward,
    Skull,
    Sparkle,
    Sparkles,
    Swords,
    UsersRound,
    Wrench,
    Zap,
} from 'lucide-react';

import { ReactionIcon } from './ReactionIcon';
import { StrikeReturnIcon } from './StrikeReturnIcon';

export { ReactionIcon, StrikeReturnIcon };

export const actionIcon = {
    actions: Swords,
    attack: Swords,
    magic: BookOpen,
    channel: Sparkle,
    ability: Zap,
    bonus: Sparkles,
    reaction: ReactionIcon,
    core: ListChecks,
    gear: Backpack,
    strikeAndReturn: StrikeReturnIcon,
    gate: Hourglass,
    move: Footprints,
    resource: Diamond,
    endTurn: Flag,
    railLog: ScrollText,
    railDm: Settings2,
    railReserve: UsersRound,
    railTools: Wrench,
    railView: Eye,
    railFx: Flame,
    railPlayerView: ScanEye,
    railExit: LogOut,
    nextTurn: SkipForward,
    stateDead: Skull,
    stateUnconscious: Moon,
    stateStable: HeartPulse,
    stateConcentrating: Brain,
} as const;

export type ActionIconKey = keyof typeof actionIcon;
