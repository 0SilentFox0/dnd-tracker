export const systemPath = {
    campaign: (action: string) => `/system/${action}`,
    character: (characterId: string, action: string) =>
        `/characters/${characterId}/system/${action}`,
    battle: (action: string) => `/system/${action}`,
};
