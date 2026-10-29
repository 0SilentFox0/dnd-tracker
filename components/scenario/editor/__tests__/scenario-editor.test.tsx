// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.unmock("next-intl");

const draft = vi.hoisted(() => ({ setContent: vi.fn(), flush: vi.fn(async () => true), reload: vi.fn() }));

vi.mock("@/lib/hooks/scenario", () => ({
  useScenarioDraft: (_c: string, page: { content: unknown }) => ({ content: page.content, state: "saved", ...draft }),
  useMentionSearch: () => async () => [],
  useActiveSection: () => null,
  useScenarioPages: () => ({ data: [] }),
  useScenarioPage: () => ({ data: undefined }),
  useScenarioPageActions: () => ({ updateMeta: vi.fn(), isPending: false }),
  useScenarioVersions: () => ({ versions: [], isLoading: false, restore: vi.fn(), isRestoring: false }),
}));
vi.mock("@/lib/hooks/show", () => ({ useDeck: () => ({ data: undefined }), useDecks: () => ({ data: [] }) }));
vi.mock("@/lib/hooks/battles", () => ({ useBattleBriefs: () => ({ data: [] }) }));
vi.mock("@/components/scenario/editor/RichTextEditor", () => ({ RichTextEditor: ({ label }: { label: string }) => <div data-testid="tiptap">{label}</div> }));

import { renderWithConfirm } from "@/components/scenario/__tests__/uk-intl";
import ScenarioEditor from "@/components/scenario/editor";
import type { ScenarioContent, ScenarioPage } from "@/types/scenario";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const page = (kind: ScenarioPage["kind"] = "scene"): ScenarioPage => ({
  id: "p1", kind, arc: null, title: "Монастир", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 1, updatedAt: "",
  content: { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: p("Дзвони"), notes: p("") }] }] },
});

const apply = () => {
  const fn = draft.setContent.mock.calls.at(-1)?.[0] as (c: ScenarioContent) => ScenarioContent;

  return fn(page().content);
};

const toc = { inline: true, drawer: { open: false, onOpenChange: vi.fn() } };

describe("ScenarioEditor", () => {
  it("комірка відкриває Tiptap лише по кліку; одночасно один редактор", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={vi.fn()} toc={toc} />);

    expect(screen.queryByTestId("tiptap")).toBeNull();
    fireEvent.click(screen.getByText("Дзвони"));
    expect(screen.getAllByTestId("tiptap")).toHaveLength(1);
  });

  it("назва розділу, новий рядок, новий розділ — через setContent", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={vi.fn()} toc={toc} />);

    fireEvent.change(screen.getByLabelText("Назва розділу"), { target: { value: "1.0 Собор" } });
    expect(apply().sections[0].title).toBe("1.0 Собор");

    fireEvent.click(screen.getByRole("button", { name: "Додати рядок" }));
    expect(apply().sections[0].rows).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Додати розділ" }));
    expect(apply().sections).toHaveLength(2);
  });

  it("видалення розділу питає підтвердження", async () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={vi.fn()} toc={toc} />);

    fireEvent.click(screen.getByRole("button", { name: "Видалити розділ: Собор" }));
    expect(await screen.findByText(/Видалити розділ «Собор»/)).toBeTruthy();
    expect(draft.setContent).not.toHaveBeenCalled();
  });

  it("на героєві є налаштування відкриття глави", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page("hero")} onExit={vi.fn()} toc={toc} />);
    expect(screen.getByRole("button", { name: "Відкрити гравцеві зараз" })).toBeTruthy();
  });

  it("«Готово» виходить після успішного збереження", async () => {
    const onExit = vi.fn();

    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={onExit} toc={toc} />);
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    await waitFor(() => expect(onExit).toHaveBeenCalled());
  });

  it("«Готово» з незбереженими змінами питає і лишається, якщо відмовитись", async () => {
    draft.flush.mockResolvedValueOnce(false);

    const onExit = vi.fn();

    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={onExit} toc={toc} />);
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    expect(await screen.findByText(/Є незбережені зміни/)).toBeTruthy();
    expect(onExit).not.toHaveBeenCalled();
  });

  it("«Готово» з незбереженими змінами виходить після підтвердження", async () => {
    draft.flush.mockResolvedValueOnce(false);

    const onExit = vi.fn();

    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={onExit} toc={toc} />);
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    fireEvent.click(await screen.findByRole("button", { name: "Вийти" }));
    await waitFor(() => expect(onExit).toHaveBeenCalled());
  });
});

describe("ScenarioEditor: знайомство", () => {
  it("кнопка «Знайомство» вимкнена без активної клітинки", () => {
    renderWithConfirm(<ScenarioEditor campaignId="c" page={page()} onExit={vi.fn()} toc={toc} />);

    expect(screen.getByRole("button", { name: "Знайомство" })).toBeDisabled();
  });
});
