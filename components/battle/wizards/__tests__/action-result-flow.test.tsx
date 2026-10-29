// @vitest-environment happy-dom
import { useEffect, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const lib = vi.hoisted(() => ({
  spells: [{ id: "ray", name: "Палаючий промінь", level: 1, dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } }],
}));

vi.mock("@/lib/hooks/spells", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/hooks/spells")>()),
  useSpells: vi.fn(() => ({ data: undefined })),
  useSpellsByIds: vi.fn((_campaignId: string, ids: string[]) => ({ data: lib.spells.filter((s) => ids.includes(s.id)) })),
}));

import { ActionResultCard } from "@/components/battle/overlays/ActionResultCard";
import { AttackWizard } from "@/components/battle/wizards/AttackWizard";
import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { BattleSceneContext,  useAttackWizard, useSpellBook } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleSceneValue } from "@/lib/hooks/battle/types";
import type { BattleAction, BattleParticipant } from "@/types/battle";

type ResultApi = BattleSceneValue["result"];

/** Справжній стан результату замість шпигуна: картка має з'явитися після відправки. */
function Stage({ value, children }: { value: BattleSceneValue; children: React.ReactNode }) {
  const [fx, show] = useState<ResultApi["fx"]>(null);

  return (
    <BattleSceneContext.Provider value={{ ...value, result: { fx, show } }}>
      {children}
      <ActionResultCard />
    </BattleSceneContext.Provider>
  );
}

function Attack({ attacker, onDone }: { attacker: BattleParticipant; onDone: () => void }) {
  const wizard = useAttackWizard(attacker, onDone);

  useEffect(() => wizard.actions.open(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <AttackWizard wizard={wizard} />;
}

function Book({ caster }: { caster: BattleParticipant }) {
  const book = useSpellBook({ ...caster, basicInfo: { ...caster.basicInfo, sourceType: "character" } }, {});

  useEffect(() => book.actions.open(1), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <SpellBook book={book} />;
}

function attackToSummary() {
  fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
  fireEvent.click(screen.getByRole("button", { name: "Далі · кидок" }));
  fireEvent.click(screen.getByRole("button", { name: "14" }));
  fireEvent.change(screen.getByLabelText("Кубик 1 (d8)"), { target: { value: "6" } });
  fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
  fireEvent.click(screen.getByRole("button", { name: /Атакувати/ }));
}

describe("результат дії не закриває карту", () => {
  afterEach(cleanup);

  it("атака: після відправки майстер закривається, підсумок не в модалці, а в картці; onDone спрацьовує", async () => {
    const afterLog = [{ actionIndex: 9, actionType: "attack", actorId: "me", targets: [{ participantId: "gob", participantName: "Гоблін" }], hpChanges: [{ participantId: "gob", participantName: "Гоблін", oldHp: 20, newHp: 11, change: 9 }], actionDetails: { isHit: true } }] as unknown as BattleAction[];

    const scene = fakeScene({ afterLog });

    scene.mutateAsync.mockResolvedValue(undefined);

    const onDone = vi.fn();

    render(<Stage value={scene.value}><Attack attacker={scene.me} onDone={onDone} /></Stage>, { wrapper: scene.wrapper });

    attackToSummary();

    const card = await screen.findByRole("status", { name: "Результат дії" });

    expect(card.textContent).toContain("Влучання");
    expect(card.textContent).toContain("−9");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onDone).toHaveBeenCalled();
  });

  it("атака: помилка лишає майстер відкритим з текстом помилки й без картки", async () => {
    const scene = fakeScene();

    scene.mutateAsync.mockRejectedValue(new Error("Стан бою змінився"));

    render(<Stage value={scene.value}><Attack attacker={scene.me} onDone={vi.fn()} /></Stage>, { wrapper: scene.wrapper });

    attackToSummary();

    expect(await screen.findByText("Стан бою змінився")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Результат дії" })).toBeNull();
  });

  it("заклинання: книга закривається, картка підсумовує шкоду по цілях", async () => {
    const scene = fakeScene({ knownSpells: ["ray"], slots: { "1": { max: 2, current: 2 } } });

    scene.castSpell.mockResolvedValue({ hpChanges: [{ participantId: "gob", participantName: "Гоблін", oldHp: 20, newHp: 15, change: 5 }] });

    render(<Stage value={scene.value}><Book caster={scene.caster} /></Stage>, { wrapper: scene.wrapper });

    fireEvent.click(await screen.findByText("Палаючий промінь"));
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    const card = await screen.findByRole("status", { name: "Результат дії" });

    expect(card.textContent).toContain("Палаючий промінь");
    expect(card.textContent).toContain("Гоблін");
    expect(card.textContent).toContain("−5");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
