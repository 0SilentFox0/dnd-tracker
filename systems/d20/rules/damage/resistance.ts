export function d20CombineResistance(percents: readonly number[]): number {
    const resist = Math.max(0, ...percents);

    const vulnerable = Math.min(0, ...percents);

    return resist > 0 && vulnerable < 0 ? 0 : resist + vulnerable;
}
