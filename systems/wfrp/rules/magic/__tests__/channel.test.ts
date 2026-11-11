import { describe, expect, it } from "vitest";

import { wfrpChannel } from "../channel";
import { CHANNEL_MAX_SL } from "../constants";
import { caster } from "./fixtures";

import { mulberry32 } from "@/lib/utils/common/rng";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

const channel = (p: ReturnType<typeof caster>, presetRoll: number) => wfrpChannel(p, { rules: WFRP_RULES, rng: mulberry32(1), presetRoll });

describe("wfrpChannel", () => {
  const p = caster({ skillAdvances: {} });

  it("banks SL and accumulates over repeated successes", () => {
    const once = channel(p, 20);

    expect(once.participant.battleData.channelledSl).toBe(2);

    expect(channel(once.participant, 20).participant.battleData.channelledSl).toBe(4);
  });

  it("caps at CHANNEL_MAX_SL", () => {
    expect(channel(caster({ skillAdvances: {}, channelledSl: CHANNEL_MAX_SL - 1 }), 20).participant.battleData.channelledSl).toBe(CHANNEL_MAX_SL);
  });

  it("a failure leaves the bank unchanged", () => {
    const r = channel(caster({ skillAdvances: {}, channelledSl: 3 }), 70);

    expect(r.participant.battleData.channelledSl).toBe(3);
    expect(r.lines[0]).toMatchObject({ message: "wfrpMagic.log.channelFail" });
  });

  it("only a 100 miscasts", () => {
    expect(channel(p, 100).miscast).toBe("minor");
    expect(channel(p, 99).miscast).toBeNull();
  });
});
