// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/battle/usePusherBattleSync", () => ({ usePusherBattleSync: () => ({ connectionState: "connected" }) }));
vi.mock("@/lib/api/battles", async (orig) => ({ ...(await orig<typeof import("@/lib/api/battles")>()), getBattle: vi.fn() }));

import { useBattleSceneValue } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { battleQueryKey } from "@/lib/hooks/battles";
import { resetPlayerViews } from "@/lib/hooks/common";
import { IntlWrapper } from "@/lib/i18n/test/intl-wrapper";

vi.unmock("next-intl");

afterEach(() => {
  cleanup();
  resetPlayerViews();
  window.sessionStorage.clear();
});

function setup() {
  const s = fakeScene({ isDM: true });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  client.setQueryData(battleQueryKey("c1", "b1"), s.battle);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <IntlWrapper>{children}</IntlWrapper>
    </QueryClientProvider>
  );

  return { Wrapper };
}

describe("вигляд гравця і перший HTML ДМ", () => {
  it("на клієнті сцена є з першого кадру, режим застосовується без скелета", () => {
    window.sessionStorage.setItem("player-view:b1", "on");

    const { Wrapper } = setup();

    const frames: Array<boolean | null> = [];

    const { result } = renderHook(
      () => {
        const { value } = useBattleSceneValue("c1", "b1", "u");

        frames.push(value ? value.viewer.isDM : null);

        return value;
      },
      { wrapper: Wrapper },
    );

    expect(frames).not.toContain(null);
    expect(result.current?.viewer.isDM).toBe(false);
    expect(result.current?.playerView).toMatchObject({ available: true, enabled: true });
  });

  it("перемикання через хук без скелета", () => {
    const { Wrapper } = setup();

    const { result } = renderHook(() => useBattleSceneValue("c1", "b1", "u").value, { wrapper: Wrapper });

    expect(result.current?.viewer.isDM).toBe(true);

    act(() => result.current?.playerView.toggle());

    expect(result.current?.viewer.isDM).toBe(false);
  });

  // last: the module-level flag cache survives between tests, only the server snapshot is independent of it
  it("серверний рендер ДМ дає сцену з prefetch (не скелет), навіть коли прапорець у sessionStorage увімкнено", () => {
    window.sessionStorage.setItem("player-view:b1", "on");

    const { Wrapper } = setup();

    const seen: Array<boolean | null> = [];

    function Probe() {
      const { value } = useBattleSceneValue("c1", "b1", "u");

      seen.push(value ? value.viewer.isDM : null);

      return null;
    }

    renderToString(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );

    expect(seen).toEqual([true]);
  });
});
