import {
    Backpack,
    BookOpen,
    Footprints,
    Hourglass,
    ListChecks,
    ScrollText,
    Settings2,
    SkipForward,
    Sparkle,
    Sparkles,
    Swords,
    Undo2,
    UsersRound,
    Wrench,
    Zap,
} from 'lucide-react';

export const actionIcon = {
    actions: Swords,
    attack: Swords,
    magic: BookOpen,
    channel: Sparkle,
    ability: Zap,
    bonus: Sparkles,
    core: ListChecks,
    gear: Backpack,
    strikeAndReturn: Undo2,
    gate: Hourglass,
    move: Footprints,
    railLog: ScrollText,
    railDm: Settings2,
    railReserve: UsersRound,
    railTools: Wrench,
    nextTurn: SkipForward,
} as const;

export type ActionIconKey = keyof typeof actionIcon;
