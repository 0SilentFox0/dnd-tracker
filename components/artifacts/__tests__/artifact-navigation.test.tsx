// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({
  calls: [] as string[],
  form: null as null | { onSubmit: (payload: unknown) => Promise<void>; onDelete?: () => Promise<void> },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: (href: string) => nav.calls.push(`push ${href}`), refresh: () => nav.calls.push("refresh") }),
}));
vi.mock("@/lib/api/artifacts", () => ({
  createArtifact: vi.fn(async () => ({})),
  updateArtifact: vi.fn(async () => ({})),
  deleteArtifact: vi.fn(async () => undefined),
  deleteAllArtifacts: vi.fn(async () => undefined),
  getArtifacts: vi.fn(async () => []),
}));
vi.mock("@/components/artifacts/ArtifactForm", () => ({
  ArtifactForm: (props: NonNullable<typeof nav.form>) => {
    nav.form = props;

    return null;
  },
}));

import { ArtifactCreateForm } from "@/components/artifacts/ArtifactCreateForm";
import { ArtifactDeleteButton } from "@/components/artifacts/ArtifactDeleteButton";
import { ArtifactEditForm } from "@/components/artifacts/ArtifactEditForm";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <ConfirmProvider>{children}</ConfirmProvider>
  </QueryClientProvider>
);

const artifact = { id: "a1", name: "Кільце", description: null, rarity: null, slot: "ring", icon: null, setId: null, abilities: [], abilityIssues: [] } as never;

beforeEach(() => {
  nav.calls.length = 0;
  nav.form = null;
});

afterEach(cleanup);

describe("навігація артефактів", () => {
  it("створення: спершу перехід до списку, потім refresh", async () => {
    render(<ArtifactCreateForm campaignId="c1" artifactSets={[]} />, { wrapper });

    await act(() => nav.form!.onSubmit({ name: "Кільце", description: null, setId: null }));

    expect(nav.calls).toEqual(["push /campaigns/c1/dm/artifacts", "refresh"]);
  });

  it("редагування і видалення з форми: перехід, потім refresh", async () => {
    render(<ArtifactEditForm campaignId="c1" artifact={artifact} artifactSets={[]} />, { wrapper });

    await act(() => nav.form!.onSubmit({ name: "Кільце" }));
    expect(nav.calls).toEqual(["push /campaigns/c1/dm/artifacts", "refresh"]);

    nav.calls.length = 0;
    await act(() => nav.form!.onDelete!());
    expect(nav.calls).toEqual(["push /campaigns/c1/dm/artifacts", "refresh"]);
  });

  it("кнопка видалення в серверному списку оновлює сторінку після підтвердження", async () => {
    render(<ArtifactDeleteButton campaignId="c1" artifactId="a1" />, { wrapper });

    fireEvent.click(screen.getByTitle("Видалити артефакт"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(nav.calls).toEqual(["refresh"]));
  });
});
