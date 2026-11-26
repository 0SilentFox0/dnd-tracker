import {
    Boxes,
    Braces,
    Copy,
    Crown,
    FileUp,
    Globe,
    Image as ImageIcon,
    type LucideIcon,
    Map,
    MessageSquare,
    Music,
    Network,
    NotebookPen,
    Package,
    ScrollText,
    Settings2,
    Sparkles,
    Swords,
    UserRound,
    Wand2,
} from 'lucide-react';

import type { Locale } from '@/lib/i18n/config';

export interface ShowcaseMedia {
    image?: string;
    ratio?: '16/10' | '9/16';
}

const SHOT_FILE = {
    combat: 'battle',
    combat1: 'combat-1',
    combat2: 'combat-2',
    combat3: 'combat-3',
    scenario: 'scenario',
    show: 'show',
    world: 'world',
    phone: 'player-mobile',
    hero: 'hero',
    mechanics: 'constructor',
    dashboard: 'dashboard',
    soundboard: 'soundboard',
    sheet: 'sheet',
    scenarioGraph: 'scenario-graph',
    contentCopy: 'content-copy',
    mcp: 'mcp',
} as const;

export type ShowcaseId = keyof typeof SHOT_FILE;

export function showcaseMedia(
    locale: Locale
): Record<ShowcaseId, ShowcaseMedia> {
    return Object.fromEntries(
        (Object.keys(SHOT_FILE) as ShowcaseId[]).map((id) => [
            id,
            {
                image: `/landing/${locale}/screen-${SHOT_FILE[id]}.webp`,
                ratio: id === 'phone' ? '9/16' : '16/10',
            },
        ])
    ) as Record<ShowcaseId, ShowcaseMedia>;
}

export const HERO_SHOT: ShowcaseId = 'dashboard';

export const PREP_PANELS = [
    'scenario',
    'show',
    'world',
] as const satisfies readonly ShowcaseId[];

export const PROBLEM_ICONS: LucideIcon[] = [
    Map,
    Swords,
    ScrollText,
    MessageSquare,
    Music,
    NotebookPen,
    ImageIcon,
];

export const CAPABILITY_ICONS: Record<string, LucideIcon> = {
    races: Crown,
    classes: Boxes,
    units: Swords,
    abilities: Wand2,
    spells: Sparkles,
    artifacts: Package,
    rules: Settings2,
    import: FileUp,
    api: Braces,
};

export const FX_SPRITES = [
    {
        sprite: 'ld-sprite-explosion',
        glow: 'rgba(255,120,40,.35)',
        scale: 'scale-[2]',
    },
    {
        sprite: 'ld-sprite-lightning',
        glow: 'rgba(120,170,255,.35)',
        scale: 'scale-100',
    },
    {
        sprite: 'ld-sprite-dark-bolt',
        glow: 'rgba(170,90,255,.35)',
        scale: 'scale-[1.4]',
    },
    {
        sprite: 'ld-sprite-rings',
        glow: 'rgba(90,220,255,.3)',
        scale: 'scale-[2]',
    },
    {
        sprite: 'ld-sprite-spark',
        glow: 'rgba(255,220,120,.3)',
        scale: 'scale-[3]',
    },
];

export const FEATURE_ITEMS: Record<
    string,
    { icon: LucideIcon; shot?: ShowcaseId }
> = {
    sheet: { icon: UserRound, shot: 'sheet' },
    world: { icon: Globe, shot: 'world' },
    mapEditor: { icon: Map },
    soundboard: { icon: Music, shot: 'soundboard' },
    scenarioGraph: { icon: Network, shot: 'scenarioGraph' },
    contentCopy: { icon: Copy, shot: 'contentCopy' },
    mcp: { icon: Braces, shot: 'mcp' },
};
