import {
    Backpack,
    BookOpen,
    Footprints,
    Hourglass,
    ListChecks,
    Sparkle,
    Sparkles,
    Swords,
    Undo2,
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
} as const;

export type ActionIconKey = keyof typeof actionIcon;
