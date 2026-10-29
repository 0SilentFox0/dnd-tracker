// @vitest-environment happy-dom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const toolbar = vi.hoisted(() => ({ props: [] as { onAcquaintance?: () => void }[] }));

vi.mock("@/lib/hooks/scenario", () => ({
  useScenarioDraft: (_c: string, page: { content: unknown }) => ({ content: page.content, state: "saved", setContent: vi.fn(), flush: vi.fn(async () => true), hasUnsavedChanges: () => false, reload: vi.fn() }),
  useMentionSearch: () => async () => [],
  useActiveSection: () => null,
  useScenarioPages: () => ({ data: [] }),
  useScenarioPage: () => ({ data: undefined }),
  useScenarioPageActions: () => ({ updateMeta: vi.fn(), isPending: false }),
  useScenarioVersions: () => ({ versions: [], isLoading: false, restore: vi.fn(), isRestoring: false }),
}));
vi.mock("@/lib/hooks/show", () => ({ useDeck: () => ({ data: undefined }), useDecks: () => ({ data: [] }) }));
vi.mock("@/lib/hooks/battles", () => ({ useBattleBriefs: () => ({ data: [] }) }));
vi.mock("@/components/scenario/editor/RichTextEditor", () => ({ RichTextEditor: () => <div /> }));
vi.mock("@/components/scenario/editor/ScenarioToolbar", () => ({
  ScenarioToolbar: (props: { onAcquaintance?: () => void }) => {
    toolbar.props.push(props);

    return <div />;
  },
}));

import ScenarioEditor from "@/components/scenario/editor";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { ScenarioPage } from "@/types/scenario";

afterEach(() => {
  cleanup();
  toolbar.props.length = 0;
});

const page = (kind: ScenarioPage["kind"]): ScenarioPage => ({
  id: "p1", kind, arc: null, title: "Т", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 1, updatedAt: "",
  content: { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [] }] },
});

const toc = { inline: true, drawer: { open: false, onOpenChange: vi.fn() } };

describe("ScenarioEditor wires the acquaintance tool", () => {
  it("gives the toolbar a handler on scene pages", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page("scene")} onExit={vi.fn()} toc={toc} />);

    expect(toolbar.props.at(-1)?.onAcquaintance).toBeTypeOf("function");
  });

  it("gives the toolbar no handler on hero pages, whose sections never become played", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page("hero")} onExit={vi.fn()} toc={toc} />);

    expect(toolbar.props.at(-1)?.onAcquaintance).toBeUndefined();
  });
});
