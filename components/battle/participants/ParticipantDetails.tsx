'use client';

import { useTranslations } from 'next-intl';

import { Section } from './Section';

import { HitFrame } from '@/components/battle/fx/PortraitFx';
import {
    EffectIcon,
    HealthBar,
    HealthLabel,
    hitFlashClass,
    HitFloat,
    HpFigure,
    ZoomablePortrait,
} from '@/components/battle/hud';
import { useSystemBattleUi } from '@/components/battle/use-system-battle-ui';
import { MonsterStatblock } from '@/components/common/MonsterStatblock';
import {
    useBattleRules,
    useBattleSceneData,
    useFxImpacts,
    useHitFx,
} from '@/lib/hooks/battle';
import { lineKey } from '@/lib/i18n/text-ref';
import { useText } from '@/lib/i18n/use-text';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import { effectName } from '@/lib/utils/battle/common/terms';
import {
    canSeeExactStats,
    effectLines,
    resolveObservedTraits,
    statblockOf,
} from '@/lib/utils/battle/view';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';

interface ParticipantDetailsProps {
    participant: BattleParticipant;
}

/** Ключ за id: при виборі іншого учасника стан FX не переноситься, і зміна HP не спливає чужою цифрою. */
export function ParticipantDetails({ participant }: ParticipantDetailsProps) {
    return (
        <ParticipantDetailsBody
            key={participant.basicInfo.id}
            participant={participant}
        />
    );
}

function EffectRow({ effect: e }: { effect: ActiveEffect }) {
    const t = useTranslations('battle.details');

    const text = useText();

    const abilityT = useTranslator('abilityRegistry');

    return (
        <div className="flex gap-3 border-b border-white/[.08] py-2.5">
            <span
                className={
                    e.type === 'buff' ? 'text-hud-gold' : 'text-hud-danger'
                }
            >
                <EffectIcon effect={e} size={36} />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[15px] font-medium text-[var(--ink)]">
                    <span>{text(effectName(e))}</span>
                    <span className="text-[13px] font-normal text-[var(--hud-muted)]">
                        {e.zone
                            ? t('zone')
                            : e.permanent
                              ? t('permanent')
                              : t('rounds', { count: e.duration })}
                    </span>
                </div>
                {effectLines(e, abilityT)
                    .map(text)
                    .map((line) => (
                        <p
                            key={line}
                            className="mt-0.5 text-[13px] leading-[18px] text-hud-soft"
                        >
                            {line}
                        </p>
                    ))}
                {e.source && (
                    <p className="text-[13px] leading-[18px] text-hud-soft">
                        {t('from', {
                            source: e.source.abilityName
                                ? `${e.source.abilityName} (${e.source.name})`
                                : e.source.name,
                        })}
                    </p>
                )}
            </div>
        </div>
    );
}

function ParticipantDetailsBody({
    participant: live,
}: ParticipantDetailsProps) {
    const t = useTranslations('battle.details');

    const text = useText();

    const { battle, viewer, effects: allEffects } = useBattleSceneData();

    const { hpTerm } = useBattleRules();

    const { ParticipantStats } = useSystemBattleUi();

    const impactFor = useFxImpacts();

    const {
        change,
        shown: participant,
        shakeRef,
    } = useHitFx<HTMLDivElement>(live, impactFor(live.basicInfo.id));

    const exact = canSeeExactStats(participant, viewer);

    const statblock = exact ? statblockOf(participant) : null;

    const log = battle.battleLog ?? [];

    const effects = allEffects.get(participant.basicInfo.id) ?? [];

    const traits = exact
        ? []
        : resolveObservedTraits(
              log,
              participant.basicInfo.id,
              battle.knowledge
          );

    return (
        <div className="text-[var(--bone)]">
            <div ref={shakeRef} className="relative flex items-center gap-4">
                <HitFrame change={change} />
                <HitFloat
                    change={change}
                    className="top-0 left-4 text-[26px]"
                />
                <ZoomablePortrait
                    flashKey={`portrait:${change?.id ?? ''}`}
                    participant={participant}
                    fx="detail"
                    size={64}
                    className={cn(!change?.impact && hitFlashClass(change))}
                />
                <div>
                    <div className="hud-sc text-[22px] leading-7 font-bold">
                        {participant.basicInfo.name}
                    </div>
                    {exact ? (
                        <div className="text-sm text-hud-text">
                            <HpFigure
                                participant={participant}
                                wounds={hpTerm === 'wounds'}
                            />
                        </div>
                    ) : (
                        <HealthLabel participant={participant} />
                    )}
                </div>
            </div>
            <HealthBar
                participant={participant}
                exact={exact}
                className="mt-3"
            />
            {statblock && (
                <Section title={t('statblock')}>
                    <MonsterStatblock block={statblock} />
                </Section>
            )}
            {ParticipantStats && (
                <ParticipantStats participant={participant} exact={exact} />
            )}
            <Section title={t('effects')}>
                {effects.length === 0 && (
                    <div className="py-2 text-sm text-[var(--hud-muted)]">
                        {t('none')}
                    </div>
                )}
                {effects.map((e) => (
                    <EffectRow key={e.id} effect={e} />
                ))}
            </Section>
            {traits.length > 0 && (
                <Section title={t('observed')}>
                    {traits.map((trait) => (
                        <div
                            key={lineKey(trait.label)}
                            className="flex min-h-10 items-center justify-between border-b border-white/[.08]"
                        >
                            <span>{text(trait.label)}</span>
                            <span className="font-medium text-[var(--ink)]">
                                {trait.kind === 'immunity'
                                    ? t('immunity')
                                    : `${trait.value}%`}
                            </span>
                        </div>
                    ))}
                </Section>
            )}
        </div>
    );
}
