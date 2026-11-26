'use client';

import type { FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

import type { BalanceView } from '../balance/BalanceMeter';
import { BattleMapStep } from '../map/BattleMapStep';
import { AutopickCard } from '../participants/AutopickCard';
import { ParticipantCatalog } from '../participants/ParticipantCatalog';
import { RosterBoard } from '../participants/RosterBoard';
import { RosterPhoneBar, sideCounts } from '../participants/RosterPhoneBar';
import { SetupHeader } from './SetupHeader';
import { SetupSummary } from './SetupSummary';

import {
    BATTLE_FORM_TAB,
    battleFormId,
    type BattleFormTabId,
} from '@/components/battle/setup/form/battle-form-tabs';
import {
    HudForm,
    HudFormMenu,
    HudFormPage,
    type HudTab,
} from '@/components/hud/form';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import {
    type BattleSetup,
    type BattleSetupInitial,
    useBattleSetup,
    useBattleSetupInitial,
    useBattleSetupView,
} from '@/lib/hooks/battles';

// two submit buttons share one row on phones: zero basis keeps flex-wrap from wrapping them
const SUBMIT_FIT =
    'min-w-0 flex-1 basis-0 truncate px-3 sm:flex-none sm:basis-auto';

interface BattleSetupFormProps {
    campaignId: string;
    battleId?: string;
}

function SetupLoading({ isEdit }: { isEdit: boolean }) {
    const t = useTranslations('battleSetup.form');

    return (
        <HudFormPage
            width="page"
            title={isEdit ? t('title.edit') : t('title.create')}
        >
            <div
                role="status"
                aria-label={t('loading')}
                className="grid min-w-0 gap-4 px-4 py-3 md:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]"
            >
                {[0, 1].map((i) => (
                    <div
                        key={i}
                        className="ds-inset h-[28rem] min-w-0 animate-pulse rounded-xl motion-reduce:animate-none"
                    />
                ))}
            </div>
        </HudFormPage>
    );
}

function mapSummary(setup: BattleSetup) {
    const { libraryMap, mapEditor } = setup;

    if (libraryMap.selectedId) {
        const picked = libraryMap.maps.find(
            (m) => m.id === libraryMap.selectedId
        );

        return {
            enabled: true,
            cols: picked?.cols ?? 0,
            rows: picked?.rows ?? 0,
        };
    }

    const { enabled, map } = mapEditor.state;

    return { enabled, cols: map.cols, rows: map.rows };
}

function ParticipantsTab({
    setup,
    balance,
    locked,
}: {
    setup: BattleSetup;
    balance: BalanceView;
    locked: boolean;
}) {
    const { participants, data, battleId } = setup;

    const view = useBattleSetupView();

    const roster = (
        <RosterBoard
            participants={participants.list}
            data={data}
            actions={participants.actions}
            balance={balance}
            autopick={
                battleId ? undefined : (
                    <AutopickCard
                        hasAllies={participants.allies.exists}
                        races={data.races}
                        balance={setup.balance}
                    />
                )
            }
        />
    );

    return (
        <div inert={locked} className="min-w-0">
            <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]">
                <div className="flex min-h-[24rem] min-w-0 flex-col md:h-[calc(100dvh-18rem)]">
                    <ParticipantCatalog
                        data={data}
                        entityStats={data.entityStats}
                        selection={participants.list}
                        actions={participants.actions}
                        tab={view.catalog}
                    />
                </div>
                <div className="hidden min-w-0 md:block md:max-h-[calc(100dvh-18rem)] md:overflow-y-auto">
                    {roster}
                </div>
            </div>
            <RosterPhoneBar
                participants={participants.list}
                balance={balance}
                roster={view.roster}
            >
                {roster}
            </RosterPhoneBar>
        </div>
    );
}

function LockedBanner() {
    const t = useTranslations('battleSetup.form');

    return (
        <p
            role="status"
            className="ds-inset mx-4 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-hud-accent-fg"
        >
            <Lock className="size-4 shrink-0" aria-hidden />
            {t('locked')}
        </p>
    );
}

function BattleSetupLayout({
    campaignId,
    battleId,
    initial,
}: BattleSetupFormProps & { initial?: BattleSetupInitial }) {
    const t = useTranslations('battleSetup.form');

    const setup = useBattleSetup(campaignId, battleId, initial);

    const tActions = useTranslations('common.actions');

    const tParticipants = useTranslations('battleSetup.participants');

    const isEdit = !!battleId;

    if (setup.loading) return <SetupLoading isEdit={isEdit} />;

    const { participants, details, form, libraryMap } = setup;

    const locked = libraryMap.isLocked;

    const balance: BalanceView = {
        kind: setup.balanceKind,
        fair: setup.fair,
        xp: setup.xp,
    };

    const map = mapSummary(setup);

    const counts = sideCounts(participants.list);

    const tabs: HudTab<BattleFormTabId>[] = [
        {
            id: BATTLE_FORM_TAB.participants,
            label: t('tabs.participants'),
            badge: tParticipants('versus', counts),
            content: (
                <ParticipantsTab
                    setup={setup}
                    balance={balance}
                    locked={locked}
                />
            ),
        },
        {
            id: BATTLE_FORM_TAB.map,
            label: t('tabs.map'),
            badge: map.enabled
                ? map.cols > 0
                    ? `✓ ${map.cols}×${map.rows}`
                    : '✓'
                : undefined,
            content: (
                <div inert={locked} className="min-w-0">
                    <BattleMapStep
                        campaignId={campaignId}
                        editor={setup.mapEditor}
                        library={libraryMap}
                    />
                </div>
            ),
        },
    ];

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter;

        form.actions.submit(e, {
            start: submitter?.getAttribute('value') === 'start',
        });
    };

    const saving = form.status.isSaving;

    const formId = battleFormId(isEdit);

    return (
        <HudFormPage
            width="page"
            title={isEdit ? t('title.edit') : t('title.create')}
            actions={
                <>
                    <SetupSummary
                        participants={participants.list}
                        balance={balance}
                        map={map}
                    />
                    {isEdit && (
                        <HudFormMenu
                            label={t('more')}
                            items={[
                                {
                                    label: tActions('delete'),
                                    tone: 'danger',
                                    onSelect: form.actions.remove,
                                },
                            ]}
                        />
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="hidden sm:inline-flex"
                        asChild
                    >
                        <Link href={`/campaigns/${campaignId}/dm/battles`}>
                            {tActions('cancel')}
                        </Link>
                    </Button>
                    {!isEdit && (
                        <Button
                            type="submit"
                            form={formId}
                            name="intent"
                            value="start"
                            variant="outline"
                            className={SUBMIT_FIT}
                            disabled={saving}
                        >
                            {t('createAndStart')}
                        </Button>
                    )}
                    <Button
                        type="submit"
                        form={formId}
                        className={SUBMIT_FIT}
                        disabled={saving || locked}
                    >
                        {isEdit
                            ? saving
                                ? tActions('saving')
                                : t('saveChanges')
                            : saving
                              ? tActions('creating')
                              : t('title.create')}
                    </Button>
                </>
            }
        >
            <OnboardingHint id="dm.battle-setup" className="mx-4 mb-1" />
            <SetupHeader
                details={details}
                campaignId={campaignId}
                isEdit={isEdit}
                locked={locked}
            />
            {locked && <LockedBanner />}
            <HudForm id={formId} onSubmit={onSubmit} tabs={tabs} />
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
