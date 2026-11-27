import type { SpeciesProfile } from '../profile';

import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';

type Appearance = NonNullable<SpeciesProfile['appearance']>;

const CM_PER_INCH = 2.54;

const sumD10 = (dice: number, rng: Rng) => {
    let sum = 0;

    for (let i = 0; i < dice; i++) sum += rollDie(10, rng);

    return sum;
};

export function rollAppearance(
    a: Appearance,
    field: 'age' | 'height' | 'eyes' | 'hair',
    rng: Rng
): { roll: number; value: string } {
    if (field === 'age') {
        const roll = sumD10(a.age.dice, rng);

        return { roll, value: String(a.age.base + roll) };
    }

    if (field === 'height') {
        const roll = sumD10(a.heightCm.dice, rng);

        return {
            roll,
            value: String(a.heightCm.base + Math.round(roll * CM_PER_INCH)),
        };
    }

    const list = field === 'eyes' ? a.eyes : a.hair;

    const roll = rollDie(100, rng);

    return { roll, value: list[Math.floor(((roll - 1) * list.length) / 100)] };
}
