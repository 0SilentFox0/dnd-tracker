import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';

import { avatarStep, backgroundStep, type RollKey, scoreSteps } from './draft-form-helpers';
import { characterKeys } from './keys';
import { draftPortraitsQuery, useDraftPortraits } from './useDraftPortraits';
import type { RollStep } from './useRollReveal';

import { ALIGNMENTS } from '@/lib/constants/alignment';
import { HERO_ARCHETYPE_KEYS } from '@/lib/constants/hero-archetypes';
import type { Locale } from '@/lib/i18n/config';
import {
    ARCHETYPE_PRIMARY,
    archetypeClasses,
    assignByPriority,
    assignStandardArray,
    classPrimaryAbilities,
    createRng,
    generateBackstory as generateLocalBackstory,
    generateCharacter,
    generateName,
    pick,
} from '@/lib/utils/characters/generate';
import type { DraftInput } from '@/types/characters';
import type { GameClassData } from '@/types/classes';

const seedNow = () => Date.now();

export interface PlayerDraftGenerateOptions {
    campaignId: string;
    values: DraftInput;
    setValues: Dispatch<SetStateAction<DraftInput>>;
    start(steps: Array<RollStep<RollKey>>): void;
    raceNames: string[];
    classBased: boolean;
    classes: GameClassData[];
    autoGenerate: boolean;
}

export function usePlayerDraftGenerate({
    campaignId,
    values,
    setValues,
    start,
    raceNames,
    classBased,
    classes,
    autoGenerate,
}: PlayerDraftGenerateOptions) {
    const locale = useLocale() as Locale;

    const t = useTranslations('characters.draft');

    const tArchetype = useTranslations('characters.archetypes');

    const queryClient = useQueryClient();

    const raceStep = useCallback(
        (race: string): RollStep<RollKey> => ({
            key: 'race',
            pool: () =>
                raceNames.length ? pick(Math.random, raceNames) : race,
            final: race,
        }),
        [raceNames]
    );

    const nameStep = useCallback(
        (name: string, race: string): RollStep<RollKey> => ({
            key: 'name',
            pool: () => generateName(race, Math.random, locale),
            final: name,
        }),
        [locale]
    );

    const portraitPools = useDraftPortraits(campaignId);

    const portraitPool = useCallback(
        (race: string) =>
            queryClient.getQueryData<Record<string, string[]>>(
                characterKeys.draftPortraits(campaignId)
            )?.[race] ?? [],
        [queryClient, campaignId]
    );

    const canReroll = (portraitPools.data?.[values.race]?.length ?? 0) > 0;

    const all = useCallback(() => {
        const seed = seedNow();

        const g = generateCharacter({
            races: raceNames,
            seed,
            classes: classBased ? classes : undefined,
            locale,
        });

        const pool = portraitPool(g.race);

        const portrait = pool.length ? pick(createRng(seed), pool) : undefined;

        if (!pool.length && g.race) {
            queryClient
                .fetchQuery(draftPortraitsQuery(campaignId))
                .then((pools) => {
                    const loaded = pools[g.race] ?? [];

                    if (loaded.length)
                        setValues((prev) =>
                            prev.race === g.race
                                ? {
                                      ...prev,
                                      avatar: pick(createRng(seed), loaded),
                                  }
                                : prev
                        );
                })
                .catch(() => undefined);
        }

        setValues((prev) => ({
            ...prev,
            name: g.name,
            race: g.race,
            archetype: g.archetype,
            class: g.class,
            classId: g.classId,
            alignment: g.alignment,
            method: g.method,
            ...g.scores,
            primaryAbility: g.primaryAbility,
            background: g.background,
            goals: g.goals,
            ...(portrait && { avatar: portrait }),
        }));

        start([
            raceStep(g.race),
            ...(portrait ? [avatarStep(portrait, pool)] : []),
            ...(classBased
                ? []
                : [
                      {
                          key: 'archetype' as const,
                          pool: () =>
                              tArchetype(
                                  `${pick(Math.random, HERO_ARCHETYPE_KEYS)}.name`
                              ),
                          final: tArchetype(`${g.archetype}.name`),
                      },
                  ]),
            {
                key: 'class',
                pool: () =>
                    classBased
                        ? pick(Math.random, classes).name
                        : archetypeClasses(locale)[
                              pick(Math.random, HERO_ARCHETYPE_KEYS)
                          ],
                final: g.class,
            },
            {
                key: 'alignment',
                pool: () => pick(Math.random, ALIGNMENTS),
                final: g.alignment,
            },
            nameStep(g.name, g.race),
            ...scoreSteps(g.scores),
            backgroundStep(g.background),
        ]);
    }, [
        setValues,
        raceNames,
        raceStep,
        start,
        portraitPool,
        queryClient,
        campaignId,
        classBased,
        classes,
        tArchetype,
        nameStep,
        locale,
    ]);

    const name = useCallback(() => {
        const next = generateName(values.race, Math.random, locale);

        setValues((prev) => ({ ...prev, name: next }));

        start([nameStep(next, values.race)]);
    }, [setValues, start, values.race, locale, nameStep]);

    const scores = useCallback(() => {
        const cls = classBased
            ? classes.find((c) => c.id === values.classId)
            : undefined;

        const priority = cls
            ? classPrimaryAbilities(cls)
            : ARCHETYPE_PRIMARY[values.archetype];

        const next = cls
            ? assignByPriority(priority, Math.random)
            : assignStandardArray(values.archetype, Math.random);

        setValues((prev) => ({
            ...prev,
            method: 'standard',
            ...next,
            primaryAbility: priority[0] ?? ARCHETYPE_PRIMARY[prev.archetype][0],
        }));

        start(scoreSteps(next));
    }, [
        setValues,
        start,
        values.archetype,
        values.classId,
        classBased,
        classes,
    ]);

    const backstory = useCallback(() => {
        const next = generateLocalBackstory(
            {
                name: values.name || t('defaultHeroName'),
                raceName: values.race,
                archetype: values.archetype,
            },
            Math.random,
            locale
        );

        setValues((prev) => ({ ...prev, ...next }));

        start([backgroundStep(next.background)]);
    }, [setValues, start, values.archetype, values.name, values.race, t, locale]);

    const portrait = useCallback(() => {
        const pool = portraitPool(values.race);

        const options =
            pool.length > 1
                ? pool.filter((url) => url !== values.avatar)
                : pool;

        if (!options.length) return;

        const next = pick(createRng(seedNow()), options);

        setValues((prev) => ({ ...prev, avatar: next }));
        start([avatarStep(next, pool)]);
    }, [setValues, portraitPool, start, values.race, values.avatar]);

    const autoGenerated = useRef(false);

    useEffect(() => {
        if (!autoGenerate || autoGenerated.current || portraitPools.isPending)
            return;

        autoGenerated.current = true;

        all();
    }, [autoGenerate, portraitPools.isPending, all]);

    return {
        generate: {
            all,
            name,
            scores,
            backstory,
            portrait,
            canPortrait: canReroll,
        },
    };
}
