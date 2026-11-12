const campaign = '/api/campaigns/:id';

const character = `${campaign}/characters/:characterId`;

const system = (scope: string, from: string, action: string) => ({
    source: `${scope}/${from}`,
    destination: `${scope}/system/${action}`,
});

export const SYSTEM_ROUTE_REWRITES: readonly {
    source: string;
    destination: string;
}[] = [
    system(character, 'advance', 'advance'),
    system(character, 'career', 'career'),
    system(character, 'career/advance', 'career.advance'),
    system(character, 'corruption', 'corruption'),
    system(character, 'corruption/undo', 'corruption.undo'),
    system(character, 'downtime', 'downtime'),
    system(character, 'level-up', 'level-up'),
    system(character, 'hit-dice', 'hit-dice'),
    system(character, 'arcane-recovery', 'arcane-recovery'),
    system(character, 'progression', 'progression'),
    system(character, 'progression/learn', 'progression.learn'),
    system(character, 'progression/unlearn', 'progression.unlearn'),
    system(character, 'progression/reset', 'progression.reset'),
    system(campaign, 'downtime/period', 'downtime.period'),
    system(campaign, 'downtime/period-undo', 'downtime.period-undo'),
    system(campaign, 'race-profiles', 'race-profiles'),
    {
        source: `${campaign}/races/:raceId/profile`,
        destination: `${campaign}/system/race-profile?raceId=:raceId`,
    },
];
