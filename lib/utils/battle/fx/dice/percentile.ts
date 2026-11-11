export function percentileDice(roll: number): [{ sides: 10; value: number; tens: true }, { sides: 10; value: number; units: true }] {
  return [{ sides: 10, value: Math.floor((roll === 100 ? 0 : roll) / 10) || 10, tens: true }, { sides: 10, value: roll % 10 || 10, units: true }];
}
