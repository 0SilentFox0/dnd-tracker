// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRaceProfiles, useSaveRaceProfile } from "../useRaceProfiles";

import { raceProfileKeys } from "@/lib/hooks/races";
import { getRaceProfiles, saveRaceProfile } from "@/systems/wfrp/api/races";

vi.mock("@/systems/wfrp/api/races", () => ({ getRaceProfiles: vi.fn(), saveRaceProfile: vi.fn() }));

const item = { raceId: "r1", profile: { mods: {}, move: 4, fate: 2, extraWounds: 0, talents: [], randomTalentCount: 0, randomTalents: [], careerTable: [] } };

describe("race profile hooks", () => {
  it("caches the list under raceProfileKeys.list and invalidates it on save", async () => {
    vi.mocked(getRaceProfiles).mockResolvedValue([item]);
    vi.mocked(saveRaceProfile).mockResolvedValue(item);

    const client = new QueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const list = renderHook(() => useRaceProfiles("c1"), { wrapper });

    await waitFor(() => expect(list.result.current.data).toEqual([item]));

    expect(client.getQueryData(raceProfileKeys.list("c1"))).toEqual([item]);

    const save = renderHook(() => useSaveRaceProfile("c1"), { wrapper });

    await act(async () => save.result.current.mutateAsync({ raceId: "r1", profile: item.profile }));

    expect(saveRaceProfile).toHaveBeenCalledWith("c1", "r1", item.profile);
    await waitFor(() => expect(getRaceProfiles).toHaveBeenCalledTimes(2));
  });
});
