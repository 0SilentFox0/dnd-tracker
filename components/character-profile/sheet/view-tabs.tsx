import type { ComponentType } from 'react';

import { InventoryTab } from '../inventory/InventoryTab';
import { CharacterLogTab } from '../rest/CharacterLogTab';
import { CombatTab } from '../tabs/CombatTab';
import type { ProfileTab, ProfileTabId } from '../tabs/ProfileTabs';
import { SkillsTab } from '../tabs/SkillsTab';
import { StoryTab } from '../tabs/StoryTab';
import { SheetStatsPanel } from './SheetStatsPanel';

const VIEW_TABS: ProfileTabId[] = [
    'stats',
    'combat',
    'magic',
    'items',
    'skills',
    'story',
    'advancement',
    'downtime',
    'log',
];

export const asTab = (v: string | undefined): ProfileTabId => {
    const id = v === 'stash' ? 'items' : v;

    return id && (VIEW_TABS as string[]).includes(id)
        ? (id as ProfileTabId)
        : 'stats';
};

interface ViewTabsFlags {
    withLog: boolean;
    withPath: boolean;
    withMagic: ComponentType | false;
    withAdvancement: ComponentType | false;
    withDowntime: ComponentType | false;
    withItems: boolean;
}

type TabLabelKey = Exclude<ProfileTabId, 'skills'> | 'traits';

export function viewTabs(
    {
        withLog,
        withPath,
        withMagic: Magic,
        withAdvancement: Advancement,
        withDowntime: Downtime,
        withItems,
    }: ViewTabsFlags,
    t: (key: TabLabelKey) => string
): ProfileTab[] {
    const tabs: (ProfileTab | false)[] = [
        { id: 'stats', label: t('stats'), content: <SheetStatsPanel /> },
        { id: 'combat', label: t('combat'), content: <CombatTab /> },
        !!Magic && { id: 'magic', label: t('magic'), content: <Magic /> },
        withItems && {
            id: 'items',
            label: t('items'),
            content: <InventoryTab />,
        },
        withPath && {
            id: 'skills',
            label: t('traits'),
            content: <SkillsTab />,
        },
        { id: 'story', label: t('story'), content: <StoryTab /> },
        !!Advancement && {
            id: 'advancement',
            label: t('advancement'),
            content: <Advancement />,
        },
        !!Downtime && {
            id: 'downtime',
            label: t('downtime'),
            content: <Downtime />,
        },
        withLog && { id: 'log', label: t('log'), content: <CharacterLogTab /> },
    ];

    return tabs.filter((x): x is ProfileTab => !!x);
}
