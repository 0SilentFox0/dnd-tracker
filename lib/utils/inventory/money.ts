import { type Coin, COIN_LABEL, COIN_VALUE, COINS } from "@/lib/constants/inventory";
import type { Purse } from "@/types/inventory";

export const toCopper = (p: Purse) => COINS.reduce((s, c) => s + p[c] * COIN_VALUE[c], 0);

const payOrder = (coin: Coin): Coin[] => {
  const lower = COINS.filter((c) => COIN_VALUE[c] < COIN_VALUE[coin]);

  const higher = COINS.filter((c) => COIN_VALUE[c] > COIN_VALUE[coin]).reverse();

  return [coin, ...lower, ...higher];
};

export function spendCoins(purse: Purse, amount: number, coin: Coin): Purse | null {
  let due = amount * COIN_VALUE[coin];

  if (toCopper(purse) < due) return null;

  const next = { ...purse };

  for (const c of payOrder(coin)) {
    const use = Math.min(next[c], Math.floor(due / COIN_VALUE[c]));

    next[c] -= use;
    due -= use * COIN_VALUE[c];
  }

  if (due === 0) return next;

  // greedy left a remainder smaller than every coin still held: break the smallest one
  const breakCoin = [...COINS].reverse().find((c) => next[c] > 0)!;

  next[breakCoin] -= 1;

  let change = COIN_VALUE[breakCoin] - due;

  for (const c of COINS.filter((x) => COIN_VALUE[x] < COIN_VALUE[breakCoin])) {
    next[c] += Math.floor(change / COIN_VALUE[c]);
    change %= COIN_VALUE[c];
  }

  return next;
}

export const gainCoins = (purse: Purse, amount: number, coin: Coin): Purse => ({ ...purse, [coin]: purse[coin] + amount });

export const formatCoins = (delta: Partial<Purse>) =>
  COINS.filter((c) => delta[c])
    .map((c) => `${delta[c]! < 0 ? "−" : "+"}${Math.abs(delta[c]!)} ${COIN_LABEL[c]}`)
    .join(" ");
