// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HeroEyesSelect } from "../HeroEyesSelect";

import * as api from "@/lib/api/world";
import { useHeroEyes } from "@/lib/hooks/world";

vi.mock("@/lib/api/world");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const heroes = [{ id: "h1", name: "Aria", avatar: null }];

describe("HeroEyesSelect", () => {
  it("reports the chosen hero and null for the DM view", () => {
    const onChange = vi.fn();

    render(<HeroEyesSelect heroes={heroes} value={null} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Очима героя"), { target: { value: "h1" } });

    expect(onChange).toHaveBeenLastCalledWith("h1");

    cleanup();
    render(<HeroEyesSelect heroes={heroes} value="h1" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Очима героя"), { target: { value: "" } });

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe("useHeroEyes", () => {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

  it("does not fetch the view until a hero is chosen, then sends asHeroId", async () => {
    vi.mocked(api.getWorldView).mockResolvedValue({} as never);

    const { result } = renderHook(() => useHeroEyes("c1", "m1"), { wrapper });

    expect(api.getWorldView).not.toHaveBeenCalled();

    act(() => result.current.setAsHeroId("h1"));

    await waitFor(() => expect(api.getWorldView).toHaveBeenCalledWith("c1", { mapId: "m1", asHeroId: "h1" }));
  });
});
