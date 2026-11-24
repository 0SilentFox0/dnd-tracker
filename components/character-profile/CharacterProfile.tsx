import { type ReactNode, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { LevelSeen } from './sheet/LevelSeen';
import { SheetBadges, SheetDmActions } from './sheet/SheetHeaderSlots';
import { SheetLayout } from './sheet/SheetLayout';
import { SheetNotices } from './sheet/SheetNotices';
import { useScrolledPast } from './sheet/useScrolledPast';
import { useSheetTab } from './sheet/useSheetTab';
import { viewTabs } from './sheet/view-tabs';
import { MagicTab } from './tabs/MagicTab';
import { ProfileProvider } from './ProfileContext';

import '@/components/hud/hud.css';
import { LoadingState, QueryState } from '@/components/common/states';
import { HUD_SURFACE } from '@/components/hud';
import { systemUiOf } from '@/components/systems';
import { SystemGate } from '@/components/systems/SystemGate';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useCharacterSheet } from '@/lib/hooks/characters';
import { campaignSystemOf } from '@/lib/hooks/systems';
import { cn } from '@/lib/utils';

const ProfileEditor = dynamic(
    () => import('./ProfileEditor').then((m) => m.ProfileEditor),
    { ssr: false, loading: () => <LoadingState /> }
);

export function ProfileShell({ children }: { children: ReactNode }) {
    return (
        <div
            className={cn(
                HUD_SURFACE,
                'pb-[calc(env(safe-area-inset-bottom,0px)+3rem)]'
            )}
        >
            {children}
        </div>
    );
}

function CharacterProfileView({
    campaignId,
    characterId,
    canEdit,
    initialTab,
}: {
    campaignId: string;
    characterId: string;
    canEdit: boolean;
    initialTab?: string;
}) {
    const t = useTranslations('characterProfile');

    const query = useCharacterSheet(campaignId, characterId);

    const { data: rules } = useCampaignRules(campaignId);

    const { tab, setTab } = useSheetTab(initialTab);

    const hero = useScrolledPast();

    const [editing, setEditing] = useState(false);

    return (
        <QueryState query={query}>
            {(sheet) => {
                const { def: system, system: current } = campaignSystemOf(
                    rules,
                    sheet.system
                );

                const ui = systemUiOf(current.key, current.modules);

                const tabs = viewTabs(
                    {
                        withLog: !!sheet.rest,
                        withPath: !ui.hideProgression,
                        withMagic: system.spells && (ui.MagicTab ?? MagicTab),
                        withAdvancement:
                            (sheet.viewer.isDM || sheet.viewer.isOwner) &&
                            (ui.AdvancementTab ?? false),
                        withDowntime:
                            (sheet.viewer.isDM || sheet.viewer.isOwner) &&
                            (ui.DowntimeTab ?? false),
                        withItems: system.inventory,
                    },
                    (id) => t(`tabs.${id}`)
                );

                return (
                    <ProfileProvider
                        campaignId={campaignId}
                        characterId={characterId}
                        sheet={sheet}
                        canEdit={canEdit && sheet.viewer.isDM}
                    >
                        <ProfileShell>
                            <LevelSeen />
                            {editing ? (
                                <ProfileEditor
                                    onDone={() => setEditing(false)}
                                />
                            ) : (
                                <>
                                    <SheetLayout
                                        heroRef={hero.ref}
                                        identity={{
                                            badge: (
                                                <SheetBadges
                                                    hideProgression={
                                                        !!ui.hideProgression
                                                    }
                                                    onLevelUp={() =>
                                                        setTab('skills')
                                                    }
                                                />
                                            ),
                                            actions: canEdit &&
                                                sheet.viewer.isDM && (
                                                    <SheetDmActions
                                                        onEdit={() =>
                                                            setEditing(true)
                                                        }
                                                    />
                                                ),
                                        }}
                                        tabs={{
                                            items: tabs,
                                            value: tab,
                                            onChange: setTab,
                                        }}
                                        scrolledPast={hero.past}
                                    >
                                        <SheetNotices />
                                    </SheetLayout>
                                    {ui.sheet?.overlays?.map((Overlay, i) => (
                                        <Overlay
                                            key={i}
                                            campaignId={campaignId}
                                            characterId={characterId}
                                            name={sheet.identity.name}
                                        />
                                    ))}
                                </>
                            )}
                        </ProfileShell>
                    </ProfileProvider>
                );
            }}
        </QueryState>
    );
}

export function CharacterProfile(props: {
    campaignId: string;
    characterId: string;
    canEdit: boolean;
    initialTab?: string;
}) {
    const query = useCharacterSheet(props.campaignId, props.characterId);

    const rulesQuery = useCampaignRules(props.campaignId);

    const system =
        rulesQuery.data?.system ??
        (!rulesQuery.isPending && query.data
            ? { key: query.data.system }
            : undefined);

    if (!system)
        return <QueryState query={query}>{() => <LoadingState />}</QueryState>;

    return (
        <SystemGate system={system}>
            <CharacterProfileView {...props} />
        </SystemGate>
    );
}
