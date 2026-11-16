'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { AutopickCard } from './AutopickCard';
import { BalanceSummary } from './BalanceSummary';
import { BattleFormBasicInfo } from './BattleFormBasicInfo';
import { BattleFormMap } from './BattleFormMap';
import { BattleMapLibraryPicker } from './BattleMapLibraryPicker';
import { CharactersListCard } from './CharactersListCard';
import { SidePanelCard } from './SidePanelCard';
import { UnitsListCard } from './UnitsListCard';
import { XpBalanceSummary } from './XpBalanceSummary';

import {
    BATTLE_FORM_TAB,
    type BattleFormTabId,
} from '@/components/battle/setup/battle-form-tabs';
import { LoadingState } from '@/components/common/states';
import { HudForm, HudFormPage, type HudTab } from '@/components/hud/form';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ParticipantSide } from '@/lib/constants/battle';
import {
    type BattleSetupInitial,
    useBattleSetup,
    useBattleSetupInitial,
} from '@/lib/hooks/battles';

interface BattleSetupFormProps {
    campaignId: string;
    battleId?: string;
}

const PAGE_CLASS = 'max-w-6xl';

function SetupLoading({ isEdit }: { isEdit: boolean }) {
    const t = useTranslations('battleSetup.form');

    return (
        <HudFormPage
            title={isEdit ? t('title.edit') : t('title.create')}
            className={PAGE_CLASS}
        >
            <div className="px-4 py-3">
                <LoadingState label={t('loading')} />
            </div>
        </HudFormPage>
    );
}

function BattleSetupLayout({
    campaignId,
    battleId,
    initial,
}: BattleSetupFormProps & { initial?: BattleSetupInitial }) {
    const t = useTranslations('battleSetup.form');

    const tMap = useTranslations('battleSetup.map');

    const setup = useBattleSetup(campaignId, battleId, initial);

    const [preparedMapChosen, setPreparedMapChosen] = useState(false);

    const tActions = useTranslations('common.actions');

    const isEdit = !!battleId;

    const title = isEdit ? t('title.edit') : t('title.create');

    if (setup.loading) return <SetupLoading isEdit={isEdit} />;

    const { participants, details, data, balance, form } = setup;

    const { libraryMap, mapEditor } = setup;

    const mapChoice = libraryMap.selectedId
        ? 'prepared'
        : preparedMapChosen
          ? 'prepared'
          : mapEditor.state.enabled
            ? 'create'
            : 'none';

    const chooseMap = (choice: 'none' | 'create' | 'prepared') => {
        setPreparedMapChosen(choice === 'prepared');
        if (choice === 'none' || choice === 'create') {
            if (libraryMap.selectedId) void libraryMap.select(null);
        }
        mapEditor.actions.setEnabled(choice === 'create' ? true : false);
    };

    const sidePanel = (side: ParticipantSide) => (
        <SidePanelCard
            side={side}
            participants={participants.list}
            characters={data.characters}
            units={data.units}
            actions={participants.actions}
        />
    );

    const tabs: HudTab<BattleFormTabId>[] = [
        {
            id: BATTLE_FORM_TAB.basic,
            label: t('tabs.basic'),
            content: <BattleFormBasicInfo details={details} />,
        },
        {
            id: BATTLE_FORM_TAB.map,
            label: t('tabs.map'),
            content: (
                <div className="space-y-4">
                    <div
                        className="grid gap-3 md:grid-cols-3"
                        role="group"
                        aria-label={tMap('mapChoice.title')}
                    >
                        {(['none', 'create', 'prepared'] as const).map(
                            (choice) => (
                                <button
                                    key={choice}
                                    type="button"
                                    aria-pressed={mapChoice === choice}
                                    onClick={() => chooseMap(choice)}
                                    className={cn(
                                        'min-h-28 rounded-lg border p-4 text-left transition-colors',
                                        mapChoice === choice
                                            ? 'border-hud-gold bg-hud-gold/10 ring-1 ring-hud-gold'
                                            : 'border-hud-rule bg-background/40 hover:border-hud-gold/60 hover:bg-background/70'
                                    )}
                                >
                                    <span className="block font-semibold">
                                        {tMap(`mapChoice.${choice}.title`)}
                                    </span>
                                    <span className="mt-1 block text-sm text-hud-muted">
                                        {tMap(
                                            `mapChoice.${choice}.description`
                                        )}
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                    {mapChoice === 'prepared' ? (
                        libraryMap.visible ? (
                            <BattleMapLibraryPicker
                                campaignId={campaignId}
                                library={libraryMap}
                                onClear={() => setPreparedMapChosen(false)}
                            />
                        ) : (
                            <p className="rounded-md border border-hud-rule p-4 text-sm text-hud-muted">
                                {tMap('mapChoice.prepared.unavailable')}
                            </p>
                        )
                    ) : mapChoice === 'create' ? (
                        <BattleFormMap editor={mapEditor} />
                    ) : null}
                </div>
            ),
        },
        {
            id: BATTLE_FORM_TAB.heroes,
            label: t('tabs.heroes'),
            content: (
                <CharactersListCard
                    playerCharacters={data.playerCharacters}
                    npcCharacters={data.npcCharacters}
                    entityStats={data.entityStats?.characterStats ?? null}
                    selection={participants.selection}
                    actions={participants.actions}
                />
            ),
        },
        {
            id: BATTLE_FORM_TAB.units,
            label: t('tabs.units'),
            content: (
                <div className="space-y-4">
                    {!isEdit && (
                        <AutopickCard
                            hasAllies={participants.allies.exists}
                            races={data.races}
                            balance={balance}
                        />
                    )}
                    <UnitsListCard
                        units={data.units}
                        entityStats={data.entityStats?.unitStats ?? null}
                        selection={participants.selection}
                        actions={participants.actions}
                    />
                </div>
            ),
        },
        {
            id: BATTLE_FORM_TAB.roster,
            label: t('tabs.roster', { count: participants.list.length }),
            content: (
                <div>
                    {setup.balanceKind === 'xp' && (
                        <XpBalanceSummary xp={setup.xp} units={data.units} />
                    )}
                    {setup.balanceKind === 'fair' && (
                        <BalanceSummary fair={setup.fair} />
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                        {sidePanel(ParticipantSide.ALLY)}
                        {sidePanel(ParticipantSide.ENEMY)}
                    </div>
                </div>
            ),
        },
    ];

    return (
        <HudFormPage
            title={title}
            aside={isEdit ? t('aside.edit') : t('aside.create')}
            className={PAGE_CLASS}
        >
            <OnboardingHint id="dm.battle-setup" className="mb-3" />
            <HudForm
                id={isEdit ? 'battle-edit-form' : 'battle-form'}
                onSubmit={form.actions.submit}
                tabs={tabs}
                actions={
                    <>
                        {isEdit && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={form.actions.remove}
                                disabled={form.status.isDeleting}
                            >
                                {form.status.isDeleting
                                    ? t('deleting')
                                    : tActions('delete')}
                            </Button>
                        )}
                        <Button type="button" variant="outline" asChild>
                            <Link href={`/campaigns/${campaignId}/dm/battles`}>
                                {tActions('cancel')}
                            </Link>
                        </Button>
                        <Button type="submit" disabled={form.status.isSaving}>
                            {isEdit
                                ? form.status.isSaving
                                    ? tActions('saving')
                                    : t('saveChanges')
                                : form.status.isSaving
                                  ? tActions('creating')
                                  : t('title.create')}
                        </Button>
                    </>
                }
            />
        </HudFormPage>
    );
}

function EditBattleSetup({
    campaignId,
    battleId,
}: {
    campaignId: string;
    battleId: string;
}) {
    const { initial, loading } = useBattleSetupInitial(campaignId, battleId);

    if (loading) return <SetupLoading isEdit />;

    return (
        <BattleSetupLayout
            campaignId={campaignId}
            battleId={battleId}
            initial={initial}
        />
    );
}

export function BattleSetupForm({
    campaignId,
    battleId,
}: BattleSetupFormProps) {
    if (battleId)
        return <EditBattleSetup campaignId={campaignId} battleId={battleId} />;

    return <BattleSetupLayout campaignId={campaignId} />;
}
