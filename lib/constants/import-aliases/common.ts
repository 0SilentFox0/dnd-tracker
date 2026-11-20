export const CAREER_TIER_COUNT = 4;

export const CAREER_TIER_PARTS = [
    'name',
    'status',
    'earningSkill',
    'characteristics',
    'skills',
    'talents',
    'trappings',
] as const;

export type CareerTierPart = (typeof CAREER_TIER_PARTS)[number];

export const careerTierKey = (n: number, part: CareerTierPart) =>
    `tier${n}_${part}`;

const CAREER_PART_WORDS: Record<CareerTierPart, readonly [string, string]> = {
    name: ['назва', 'name'],
    status: ['статус', 'status'],
    earningSkill: ['навичка доходу', 'earning skill'],
    characteristics: ['характеристики', 'characteristics'],
    skills: ['навички', 'skills'],
    talents: ['таланти', 'talents'],
    trappings: ['спорядження', 'trappings'],
};

export const careerTierAliases = () =>
    Object.fromEntries(
        Array.from({ length: CAREER_TIER_COUNT }, (_, i) => i + 1).flatMap(
            (n) =>
                CAREER_TIER_PARTS.map(
                    (part) =>
                        [
                            careerTierKey(n, part),
                            [
                                `рівень ${n}: ${CAREER_PART_WORDS[part][0]}`,
                                `tier ${n} ${CAREER_PART_WORDS[part][1]}`,
                            ],
                        ] as const
                )
        )
    );

export const NAME = ['назва', 'name', "ім'я"];

export const ICON = ['іконка', 'icon'];

export const DESCRIPTION = ['опис', 'description'];

export const COLOR = ['колір', 'color'];

export const ABILITIES = ['здібності', 'abilities'];
