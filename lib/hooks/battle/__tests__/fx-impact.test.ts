import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fireFxImpact, onFxImpact } from "../fx-impact";

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe("fx impact signal", () => {
  it("відкриває кадр на сигнал своєї дії, чужа дія не відкриває", () => {
    const cb = vi.fn();

    onFxImpact("a1", 5000, cb);
    fireFxImpact("a0");
    expect(cb).not.toHaveBeenCalled();
    fireFxImpact("a1");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("без сигналу — запобіжник через waitMs", () => {
    const cb = vi.fn();

    onFxImpact("b1", 3000, cb);
    vi.advanceTimersByTime(2999);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
    fireFxImpact("b1");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("сигнал, що прийшов раніше за підписку, теж відкриває (асинхронно)", async () => {
    fireFxImpact("c1");

    const cb = vi.fn();

    onFxImpact("c1", 5000, cb);
    expect(cb).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("відписка скасовує і сигнал, і запобіжник", () => {
    const cb = vi.fn();

    const off = onFxImpact("d1", 1000, cb);

    off();
    fireFxImpact("d1");
    vi.advanceTimersByTime(2000);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("fx impact listeners", () => {
  it("відписка старого підписника не скидає набір новішого", () => {
    const a = vi.fn();

    const b = vi.fn();

    const offA = onFxImpact("e1", 5000, a);

    offA();

    const offB = onFxImpact("e1", 5000, b);

    offA();
    fireFxImpact("e1");
    expect(b).toHaveBeenCalledTimes(1);
    offB();
  });
});
