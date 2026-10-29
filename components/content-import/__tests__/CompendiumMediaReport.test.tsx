// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompendiumMediaReport } from "../CompendiumMediaReport";
import { CompendiumMediaSummary } from "../CompendiumMediaSummary";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { MediaProgress } from "@/types/compendium-import";

vi.unmock("next-intl");
afterEach(cleanup);

const render = (ui: React.ReactElement) => renderWithIntl(ui, { locale: "uk", namespaces: ["common", "validation", "compendium"] });

const failures = (n: number, status?: number) => Array.from({ length: n }, (_, i) => ({ id: `${status}-${i}`, host: "cdn.example", file: `a${i}.png`, reason: "MEDIA_HTTP_STATUS" as const, params: { status } }));

const media = (patch: Partial<MediaProgress> = {}): MediaProgress => ({ runId: "r", total: 30, saved: 20, failed: 3, skipped: 2, pending: 5, retryable: 3, failures: [...failures(2, 404), ...failures(1, 503)], ...patch });

const actions = () => ({ resume: vi.fn(), retryFailed: vi.fn() });

describe("CompendiumMediaReport", () => {
  it("shows counters and groups failures by reason and status", async () => {
    const { container } = await render(<CompendiumMediaReport media={media()} running={false} paused={false} actions={actions()} />);

    expect(container.textContent).toContain("20Збережено");
    expect(container.textContent).toContain("3Не вдалося");
    expect(container.textContent).toContain("Сервер відповів кодом 404");
    expect(container.textContent).toContain("Сервер відповів кодом 503");
    expect(container.querySelectorAll("details")).toHaveLength(2);
  });

  it("offers resume and retry through the actions when idle", async () => {
    const a = actions();

    await render(<CompendiumMediaReport media={media()} running={false} paused actions={a} />);
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    fireEvent.click(screen.getByRole("button", { name: "Повторити невдалі" }));
    expect(a.resume).toHaveBeenCalledOnce();
    expect(a.retryFailed).toHaveBeenCalledOnce();
    expect(screen.getByText(/Збереження зображень зупинено/)).toBeTruthy();
  });

  it("hides buttons while running or when nothing can be done", async () => {
    await render(<CompendiumMediaReport media={media()} running paused={false} actions={actions()} />);
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    await render(<CompendiumMediaReport media={media({ pending: 0, retryable: 0 })} running={false} paused={false} actions={actions()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("caps a failure group at 20 rows with a show-more button", async () => {
    await render(<CompendiumMediaReport media={media({ failures: failures(25, 404), failed: 25 })} running={false} paused={false} actions={actions()} />);

    expect(screen.getAllByText(/cdn\.example/)).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: /Ще 5|ще 5|5/ }));
    expect(screen.getAllByText(/cdn\.example/)).toHaveLength(25);
  });
});

describe("CompendiumMediaSummary", () => {
  it("shows the queued count and collapsed skip reasons", async () => {
    const { container } = await render(<CompendiumMediaSummary media={{ queued: 12, skipped: { MEDIA_LIMIT: 3, MEDIA_EXTRA: 1 } }} />);

    expect(container.textContent).toContain("Зображень: 12");
    expect(container.querySelector("details")).toBeTruthy();
    expect(container.textContent).toContain("Перевищено ліміт зображень на імпорт: 3");
  });

  it("renders nothing without images", async () => {
    const { container } = await render(<CompendiumMediaSummary media={{ queued: 0, skipped: {} }} />);

    expect(container.textContent).toBe("");
  });
});
