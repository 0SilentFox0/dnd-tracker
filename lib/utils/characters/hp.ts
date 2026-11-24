export interface HpState {
    hp: number;
    max: number;
    temp: number;
}

export interface HpChange {
    kind: 'damage' | 'heal' | 'temp';
    amount: number;
}

const clean = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function applyHpChange(
    state: HpState,
    change: HpChange
): { hp: number; tempHp: number } {
    const amount = clean(change.amount);

    const temp = clean(state.temp);

    if (change.kind === 'damage') {
        const absorbed = Math.min(temp, amount);

        return {
            hp: Math.max(0, state.hp - (amount - absorbed)),
            tempHp: temp - absorbed,
        };
    }

    if (change.kind === 'heal')
        return { hp: Math.min(state.max, state.hp + amount), tempHp: temp };

    return { hp: state.hp, tempHp: Math.max(temp, amount) };
}
