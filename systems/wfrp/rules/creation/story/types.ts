export const STORY_QUESTIONS = [
    'origin',
    'family',
    'childhood',
    'turningPoint',
    'leftHome',
    'friends',
    'loyalty',
    'hatred',
    'bestMemory',
    'worstMemory',
    'faith',
    'demeanor',
    'secret',
    'ambitionShort',
    'ambitionLong',
] as const;

export const WFRP_DRAFT_GOALS_MAX = 5;

export const APPEARANCE_QUESTIONS = ['age', 'height', 'eyes', 'hair'] as const;

export type RolledQuestionId = (typeof STORY_QUESTIONS)[number];

export type StoryQuestionId =
    | RolledQuestionId
    | (typeof APPEARANCE_QUESTIONS)[number];

export type StoryAnswers = Partial<Record<StoryQuestionId, string>>;

export type StoryBlockId =
    | 'origin'
    | 'turn'
    | 'people'
    | 'memory'
    | 'self'
    | 'appearance';

export const STORY_BLOCKS: {
    id: StoryBlockId;
    questions: StoryQuestionId[];
}[] = [
    { id: 'origin', questions: ['origin', 'family', 'childhood'] },
    { id: 'turn', questions: ['turningPoint', 'leftHome'] },
    { id: 'people', questions: ['friends', 'loyalty', 'hatred'] },
    { id: 'memory', questions: ['bestMemory', 'worstMemory', 'faith'] },
    {
        id: 'self',
        questions: ['demeanor', 'secret', 'ambitionShort', 'ambitionLong'],
    },
    { id: 'appearance', questions: [...APPEARANCE_QUESTIONS] },
];
