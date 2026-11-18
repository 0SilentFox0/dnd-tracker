export const attackSourceOf = (attack: {
    id?: string;
}): { attackSourceId?: string } =>
    attack.id ? { attackSourceId: attack.id.replace(/:off$/, '') } : {};
