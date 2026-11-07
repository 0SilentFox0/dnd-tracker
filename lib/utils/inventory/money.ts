import { type Coin, COIN_VALUE, COINS } from "@/lib/constants/inventory";
import type { Purse } from "@/types/inventory";

type CoinValue = Record<Coin, number>;

export const walletToPurse = (w: { gold: number; silver: number; copper: number }): Purse => ({ gp: w.gold, sp: w.silver, cp: w.copper });

export const toCopper = (p: Purse, value: CoinValue = COIN_VALUE) => COINS.reduce((s, c) => s + p[c] * value[c], 0);

const payOrder = (coin: Coin, value: CoinValue): Coin[] => {
  const lower = COINS.filter((c) => value[c] < value[coin]);

  const higher = COINS.filter((c) => value[c] > value[coin]).reverse();

  return [coin, ...lower, ...higher];
};

export function spendCoins(purse: Purse, amount: number, coin: Coin, value: CoinValue = COIN_VALUE): Purse | null {
  let due = amount * value[coin];

  if (toCopper(purse, value) < due) return null;

  const next = { ...purse };

  for (const c of payOrder(coin, value)) {
    const use = Math.min(next[c], Math.floor(due / value[c]));

    next[c] -= use;
    due -= use * value[c];
  }

  if (due === 0) return next;

  // greedy left a remainder smaller than every coin still held: break the smallest one
  const breakCoin = [...COINS].reverse().find((c) => next[c] > 0)!;

  next[breakCoin] -= 1;

  let change = value[breakCoin] - due;

  for (const c of COINS.filter((x) => value[x] < value[breakCoin])) {
    next[c] += Math.floor(change / value[c]);
    change %= value[c];
  }

  return next;
}

export const gainCoins = (purse: Purse, amount: number, coin: Coin): Purse => ({ ...purse, [coin]: purse[coin] + amount });

export const formatCoins = (delta: Partial<Purse>, label: (coin: Coin) => string) =>
  COINS.filter((c) => delta[c])
    .map((c) => `${delta[c]! < 0 ? "−" : "+"}${Math.abs(delta[c]!)} ${label(c)}`)
    .join(" ");
