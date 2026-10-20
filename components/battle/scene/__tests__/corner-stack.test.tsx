// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CornerStack } from "../CornerStack";

import { BattleAudioDock } from "@/components/battle/audio/BattleAudioDock";
import { BattleAudioProvider } from "@/components/battle/audio/BattleAudioProvider";
import { ActionResultCard } from "@/components/battle/overlays/ActionResultCard";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { audioState, fileTrack } from "@/lib/utils/audio/__tests__/fixtures";

vi.mock("@/lib/api/battle-audio", () => ({ getBattleAudio: vi.fn(() => new Promise(() => undefined)), sendBattleAudio: vi.fn() }));
vi.mock("@/lib/api/tracks", () => ({ getTracks: vi.fn(async () => []), updateTrack: vi.fn() }));

const audio = audioState({ track: { ...fileTrack, title: "Бій у таверні" } });

afterEach(cleanup);

describe("CornerStack", () => {
  it("лівий нижній кут: картка результату над плеєром, обидва в потоці стовпчика (без власного fixed)", () => {
    const { wrapper } = fakeScene({ audio, result: { kind: "hit", targetName: "Циклоп", damage: 10, downed: false, d20: 14 } });

    const { container } = render(
      <BattleAudioProvider>
        <CornerStack>
          <ActionResultCard />
          <BattleAudioDock placement="corner" />
        </CornerStack>
      </BattleAudioProvider>,
      { wrapper },
    );

    const stack = container.querySelector<HTMLElement>("[data-corner-stack]");

    expect(stack?.className).toContain("fixed");
    expect(stack?.className).toContain("bottom-4");
    expect(stack?.className).toContain("left-4");
    expect(stack?.className).toContain("flex-col");

    const [first, second] = [...(stack?.children ?? [])];

    expect(first.getAttribute("role")).toBe("status");
    expect(second.getAttribute("data-battle-audio")).toBe("corner");
    expect(first.className).not.toContain("fixed");
    expect(second.className).not.toContain("fixed");
  });
});
