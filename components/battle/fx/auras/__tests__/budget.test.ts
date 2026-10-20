// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AURA_ANIMATIONS } from "@/components/battle/fx/auras";
import { AuraParticles } from "@/components/battle/fx/auras/particles";
import type { AuraCtx } from "@/components/battle/fx/auras/types";
import type { FxAuraKind } from "@/lib/utils/battle/fx";
import { isGradientCall, recordingContext, stubCanvasContexts } from "@/lib/utils/canvas/__tests__/recording-canvas";

const FRAMES = 120;

beforeAll(() => {
  stubCanvasContexts();
});

afterEach(() => vi.clearAllMocks());

// Auras paint continuously on every visible portrait, so a live gradient or blur per frame is the costly regression.
describe("aura frame budget", () => {
  it.each(Object.keys(AURA_ANIMATIONS) as FxAuraKind[])("%s: no gradient or shadow blur on the canvas after the first frame", (kind) => {
    const g = recordingContext();

    const ctx: AuraCtx = { cx: 53, cy: 53, r: 24, s: 1, parts: new AuraParticles(), box: 106, dpr: 2, cache: new Map() };

    AURA_ANIMATIONS[kind].frame(g, ctx, 1.2, 1 / 30);
    g.rec.calls.length = 0;
    g.rec.blurs.length = 0;

    for (let i = 1; i < FRAMES; i++) AURA_ANIMATIONS[kind].frame(g, ctx, 1.2 + i / 30, 1 / 30);

    expect(g.rec.calls.filter(isGradientCall)).toEqual([]);
    expect(g.rec.blurs.filter((b) => b > 0)).toEqual([]);
  });
});
