import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { useRollReveal } from '@/lib/hooks/characters';
import type { Rng } from '@/lib/utils/common/rng';
import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';
import { rollAppearance } from '@/systems/wfrp/rules/creation/story/appearance';
import { composeStory } from '@/systems/wfrp/rules/creation/story/compose';
import { rollStory } from '@/systems/wfrp/rules/creation/story/tables';
import {
    APPEARANCE_QUESTIONS,
    type RolledQuestionId,
    STORY_BLOCKS,
    STORY_QUESTIONS,
    type StoryAnswers,
    type StoryQuestionId,
} from '@/systems/wfrp/rules/creation/story/types';

type Reveal = ReturnType<typeof useRollReveal<string>>;

type Appearance = SpeciesProfile['appearance'];

const isRolled = (id: StoryQuestionId): id is RolledQuestionId =>
    (STORY_QUESTIONS as readonly string[]).includes(id);

export function useStoryQuiz({
    rng,
    appearance,
    reveal,
}: {
    rng: Rng;
    appearance?: Appearance;
    reveal?: Reveal;
}) {
    const t = useTranslations('wfrpStory');

    const tc = useTranslations('wfrpCreation');

    const [answers, setAnswers] = useState<StoryAnswers>({});

    const blocks = useMemo(
        () =>
            appearance
                ? STORY_BLOCKS
                : STORY_BLOCKS.filter((b) => b.id !== 'appearance'),
        [appearance]
    );

    const appearanceKey = appearance ? JSON.stringify(appearance) : '';

    const [seenKey, setSeenKey] = useState(appearanceKey);

    if (seenKey !== appearanceKey) {
        setSeenKey(appearanceKey);
        setAnswers((prev) =>
            Object.fromEntries(
                Object.entries(prev).filter(
                    ([id]) =>
                        !(APPEARANCE_QUESTIONS as readonly string[]).includes(
                            id
                        )
                )
            )
        );
    }

    const textFor = useCallback(
        (id: StoryQuestionId): string | undefined => {
            if (isRolled(id)) return t(rollStory(id, rng).key as never);

            if (!appearance) return undefined;

            const { value } = rollAppearance(appearance, id, rng);

            return id === 'eyes' || id === 'hair'
                ? tc(`story.colours.${value}` as never)
                : value;
        },
        [t, tc, rng, appearance]
    );

    const set = useCallback(
        (id: StoryQuestionId, text: string) =>
            setAnswers((prev) => ({ ...prev, [id]: text })),
        []
    );

    const run = useCallback(
        (ids: StoryQuestionId[]) => {
            const rolled = ids.flatMap((id) => {
                const final = textFor(id);

                return final === undefined ? [] : [{ id, final }];
            });

            if (!rolled.length) return;

            setAnswers((prev) => ({
                ...prev,
                ...Object.fromEntries(rolled.map((r) => [r.id, r.final])),
            }));
            reveal?.start(
                rolled.map(({ id, final }) => ({
                    key: `story-${id}`,
                    pool: () => textFor(id) ?? final,
                    final,
                }))
            );
        },
        [textFor, reveal]
    );

    const roll = useCallback((id: StoryQuestionId) => run([id]), [run]);

    const rollAll = useCallback(
        () =>
            run(
                blocks
                    .flatMap((b) => b.questions)
                    .filter((id) => !answers[id]?.trim())
            ),
        [run, blocks, answers]
    );

    const compose = useCallback(() => {
        const visible = new Set<StoryQuestionId>(
            blocks.flatMap((b) => b.questions)
        );

        return composeStory(
            Object.fromEntries(
                Object.entries(answers).filter(([id]) =>
                    visible.has(id as StoryQuestionId)
                )
            ),
            (id, answer) =>
                t(`sentences.${id}` as 'sentences.origin', { answer })
        );
    }, [answers, blocks, t]);

    return { answers, set, roll, rollAll, blocks, compose };
}
