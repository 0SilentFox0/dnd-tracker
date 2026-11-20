'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { type AilmentDraft, AilmentsEditor } from './AilmentsEditor';
import { EndeavourPicker, isEndeavourValid } from './EndeavourPicker';
import { PeriodSummaryView } from './PeriodSummaryView';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { LoadingState } from '@/components/common/states';
import { HudSection } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { CharacterType } from '@/lib/constants/characters';
import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useCharacter, useCharacters } from '@/lib/hooks/characters';
import { useDowntime } from '@/systems/wfrp/hooks';
import { readCharacteristics } from '@/systems/wfrp/rules/characteristics/keys';
import { CANON_ENDEAVOURS_MAX } from '@/systems/wfrp/rules/downtime/constants';
import type { Endeavour } from '@/systems/wfrp/rules/downtime/types';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { SHEET_SLOT } from '@/systems/wfrp/rules/slots';

export function DowntimeTab() {
    const { campaignId, characterId, sheet } = useProfile();

    const t = useTranslations('wfrpDowntime');

    const character = useCharacter(campaignId, characterId);

    const players = useCharacters(campaignId, { type: CharacterType.PLAYER });

    const save = useDowntime(campaignId, characterId);

    const rules = useCampaignRules(campaignId).data;

    const canon = editionOf(rules).downtimeModel === 'canon5e';

    const [draft, setDraft] = useState<{
        endeavour?: Endeavour;
        endeavours?: Endeavour[];
        ailments?: AilmentDraft[];
    }>({});

    if (!character.data) return <LoadingState />;

    const isDM = sheet.viewer.isDM;

    const state = readCharacteristics(character.data).downtime ?? {
        ailments: [],
    };

    const endeavour = 'endeavour' in draft ? draft.endeavour : state.endeavour;

    const stored =
        state.endeavours ?? (state.endeavour ? [state.endeavour] : []);

    const slots = draft.endeavours ?? stored;

    const setSlots = (next: Endeavour[]) =>
        setDraft((d) => ({ ...d, endeavours: next }));

    const ailments = draft.ailments ?? state.ailments;

    const patients = (players.data ?? [])
        .filter((c) => c.id !== characterId)
        .map((c) => ({ id: c.id, name: c.name }));

    const send = (body: {
        endeavour: Endeavour | null;
        endeavours?: Endeavour[];
        ailments?: AilmentDraft[];
    }) => void save.mutateOk(body).then((ok) => ok && setDraft({}));

    const ailmentsInvalid = ailments.some(
        (a) =>
            !a.label.trim() ||
            !Number.isInteger(a.daysLeft) ||
            a.daysLeft < 1 ||
            a.daysLeft > 365
    );

    return (
        <div className="px-3 py-3">
            {canon ? (
                <HudSection title={t('tab.endeavourTitle')}>
                    <p className="mb-2 text-xs text-hud-muted">
                        {t('tab.endeavourLimit', {
                            count: slots.length,
                            max: CANON_ENDEAVOURS_MAX,
                        })}
                    </p>
                    <div className="space-y-3">
                        {slots.map((slot, i) => (
                            <div key={i} className="space-y-1">
                                <EndeavourPicker
                                    canon
                                    value={slot}
                                    onChange={(e) =>
                                        setSlots(
                                            slots.map((x, j) =>
                                                j === i ? e : x
                                            )
                                        )
                                    }
                                    patients={patients}
                                    skills={
                                        SHEET_SLOT.read(sheet.systemSlot)
                                            ?.skills ?? []
                                    }
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setSlots(
                                            slots.filter((_, j) => j !== i)
                                        )
                                    }
                                >
                                    {t('tab.removeEndeavour')}
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={slots.length >= CANON_ENDEAVOURS_MAX}
                            onClick={() =>
                                setSlots([
                                    ...slots,
                                    { kind: 'rest', params: {} },
                                ])
                            }
                        >
                            {t('tab.addEndeavour')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={
                                save.isPending || !slots.every(isEndeavourValid)
                            }
                            onClick={() =>
                                send({
                                    endeavour: slots[0] ?? null,
                                    endeavours: slots,
                                    ...(draft.ailments
                                        ? { ailments: draft.ailments }
                                        : {}),
                                })
                            }
                        >
                            {t('tab.save')}
                        </Button>
                    </div>
                    {state.training && (
                        <p className="mt-2 text-sm text-hud-bone">
                            {t('tab.trainingCredit', {
                                key: state.training.key,
                                discount: state.training.discount,
                            })}
                        </p>
                    )}
                </HudSection>
            ) : (
                <HudSection title={t('tab.endeavourTitle')}>
                    <EndeavourPicker
                        value={endeavour}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, endeavour: e }))
                        }
                        patients={patients}
                        skills={SHEET_SLOT.read(sheet.systemSlot)?.skills ?? []}
                    />
                    <div className="mt-2 flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            disabled={
                                save.isPending || !isEndeavourValid(endeavour)
                            }
                            onClick={() =>
                                send({
                                    endeavour: endeavour ?? null,
                                    ...(draft.ailments
                                        ? { ailments: draft.ailments }
                                        : {}),
                                })
                            }
                        >
                            {t('tab.save')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={save.isPending || !state.endeavour}
                            onClick={() => send({ endeavour: null })}
                        >
                            {t('tab.clear')}
                        </Button>
                    </div>
                    {state.training && (
                        <p className="mt-2 text-sm text-hud-bone">
                            {t('tab.trainingCredit', {
                                key: state.training.key,
                                discount: state.training.discount,
                            })}
                        </p>
                    )}
                </HudSection>
            )}
            <HudSection title={t('tab.ailmentsTitle')}>
                <AilmentsEditor
                    value={ailments}
                    editable={isDM}
                    onChange={(a) => setDraft((d) => ({ ...d, ailments: a }))}
                />
                {isDM && draft.ailments && (
                    <Button
                        type="button"
                        size="sm"
                        className="mt-2"
                        disabled={save.isPending || ailmentsInvalid}
                        onClick={() =>
                            send({
                                endeavour: state.endeavour ?? null,
                                ...(state.endeavours
                                    ? { endeavours: state.endeavours }
                                    : {}),
                                ailments: draft.ailments,
                            })
                        }
                    >
                        {t('tab.save')}
                    </Button>
                )}
            </HudSection>
            <HudSection title={t('tab.summaryTitle')}>
                {state.lastPeriod ? (
                    <PeriodSummaryView summary={state.lastPeriod.summary} />
                ) : (
                    <p className="text-sm text-hud-muted">
                        {t('tab.noSummary')}
                    </p>
                )}
            </HudSection>
        </div>
    );
}
