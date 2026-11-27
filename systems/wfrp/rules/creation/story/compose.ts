import { STORY_BLOCKS, type StoryAnswers, type StoryQuestionId } from './types';

import type { GoalKind } from '@/lib/constants/characters';

export const BACKGROUND_LIMIT = 4000;

export const GOAL_QUESTIONS = {
    ambitionLong: 'main',
    ambitionShort: 'personal',
    secret: 'secret',
} as const satisfies Partial<Record<StoryQuestionId, GoalKind>>;

const isGoalQuestion = (id: StoryQuestionId): id is keyof typeof GOAL_QUESTIONS =>
    id in GOAL_QUESTIONS;

function truncateAtWord(text: string): string {
    const head = text.slice(0, BACKGROUND_LIMIT + 1);

    const cut = head.search(/\s\S*$/);

    return (cut > 0 ? head.slice(0, cut) : head.slice(0, BACKGROUND_LIMIT)).trimEnd();
}

export function composeStory(
    answers: StoryAnswers,
    phrase: (id: StoryQuestionId, answer: string) => string
): {
    background: string;
    goals: { text: string; kind: GoalKind }[];
    truncated: boolean;
} {
    const goals: { text: string; kind: GoalKind }[] = [];

    const paragraphs: string[] = [];

    const ordered = [
        ...STORY_BLOCKS.filter((b) => b.id === 'appearance'),
        ...STORY_BLOCKS.filter((b) => b.id !== 'appearance'),
    ];

    for (const block of ordered) {
        const sentences: string[] = [];

        for (const id of block.questions) {
            const answer = answers[id]?.trim();

            if (!answer) continue;

            if (isGoalQuestion(id)) {
                continue;
            }

            sentences.push(phrase(id, answer));
        }

        if (sentences.length) paragraphs.push(sentences.join(' '));
    }

    for (const id of Object.keys(GOAL_QUESTIONS) as (keyof typeof GOAL_QUESTIONS)[]) {
        const text = answers[id]?.trim();

        if (text) goals.push({ text, kind: GOAL_QUESTIONS[id] });
    }

    const full = paragraphs.join('\n\n');

    const truncated = full.length > BACKGROUND_LIMIT;

    return {
        background: truncated ? truncateAtWord(full) : full,
        goals,
        truncated,
    };
}
