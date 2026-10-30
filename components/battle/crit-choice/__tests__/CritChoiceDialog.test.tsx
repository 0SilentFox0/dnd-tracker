// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CritChoiceDialog } from "../CritChoiceDialog";
import { CritChoiceWaitingBanner } from "../CritChoiceWaitingBanner";

import type { useCritChoiceDialog } from "@/lib/hooks/battle";
import { BattleSceneContext } from "@/lib/hooks/battle";
import type { BattleSceneValue } from "@/lib/hooks/battle/types";
import { renderWithConfirm } from "@/lib/i18n/test/render-uk";
import { textOf } from "@/lib/i18n/test/text";
import { critNameRef } from "@/lib/utils/battle/attack/critical";
import { critEffectsFor } from "@/lib/utils/battle/crit-choice/catalog";


vi.unmock("next-intl");

afterEach(cleanup);

type Dialog = ReturnType<typeof useCritChoiceDialog>;

const triggers = [
  { key: "t0", source: "attack", kind: "success", actorId: "me", targetId: "gob" },
  { key: "t1", source: "save", kind: "fail", actorId: "me", targetId: "ally" },
] as const;

function dialogOf(submit = vi.fn(), cancel = vi.fn()): Dialog {
  return {
    open: true,
    cancel,
    rows: triggers.map((t) => ({ trigger: t, actorName: "Фрейда", targetName: t.targetId === "gob" ? "Гоблін" : "Годрік", options: critEffectsFor(t.source, t.kind) })),
    submit,
    isSubmitting: false,
  };
}

describe("CritChoiceDialog", () => {
  it("заголовки рядків: атака — «актор → ціль», рятівний кидок — «Рятівний кидок: ціль»", () => {
    renderWithConfirm(<CritChoiceDialog dialog={dialogOf()} />);

    expect(screen.getByText("Фрейда → Гоблін: Критична удача")).toBeTruthy();
    expect(screen.getByText("Рятівний кидок: Годрік")).toBeTruthy();
  });

  it("«Підтвердити» неактивне, доки не обрано кожен рядок; потім відправляє id ефектів", () => {
    const submit = vi.fn();

    renderWithConfirm(<CritChoiceDialog dialog={dialogOf(submit)} />);

    const confirm = screen.getByRole("button", { name: "Підтвердити" }) as HTMLButtonElement;

    expect(confirm.disabled).toBe(true);

    const [first] = critEffectsFor("attack", "success");

    fireEvent.click(screen.getAllByRole("radio", { name: new RegExp(textOf(critNameRef(first))) })[0]);
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getAllByRole("button", { name: "Випадково" })[1]);
    expect(confirm.disabled).toBe(false);

    fireEvent.click(confirm);
    expect(submit).toHaveBeenCalledWith({ t0: first.id, t1: "random" });
  });

  it("«Випадково для всіх» відправляє random для кожного ключа", () => {
    const submit = vi.fn();

    renderWithConfirm(<CritChoiceDialog dialog={dialogOf(submit)} />);

    fireEvent.click(screen.getByRole("button", { name: "Випадково для всіх" }));
    expect(submit).toHaveBeenCalledWith({ t0: "random", t1: "random" });
  });

  it("«Скасувати дію» викликає cancel", () => {
    const cancel = vi.fn();

    renderWithConfirm(<CritChoiceDialog dialog={dialogOf(vi.fn(), cancel)} />);

    fireEvent.click(screen.getByRole("button", { name: "Скасувати дію" }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("закрите: нічого не рендерить", () => {
    renderWithConfirm(<CritChoiceDialog dialog={{ ...dialogOf(), open: false }} />);
    expect(screen.queryByText("Підтвердити")).toBeNull();
  });
});

describe("CritChoiceWaitingBanner", () => {
  const render = (isDM: boolean, pending: boolean) =>
    renderWithConfirm(
      <BattleSceneContext.Provider value={{ viewer: { isDM }, battle: { pendingCritChoice: pending ? { action: "attack", actorId: "me", triggers: [] } : null } } as unknown as BattleSceneValue}>
        <CritChoiceWaitingBanner />
      </BattleSceneContext.Provider>,
    );

  it("гравець бачить банер без кнопок", () => {
    render(false, true);
    expect(screen.getByText("ДМ обирає ефект…")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("ДМ і порожній pending банера не бачать", () => {
    render(true, true);
    expect(screen.queryByText("ДМ обирає ефект…")).toBeNull();
    cleanup();
    render(false, false);
    expect(screen.queryByText("ДМ обирає ефект…")).toBeNull();
  });
});
