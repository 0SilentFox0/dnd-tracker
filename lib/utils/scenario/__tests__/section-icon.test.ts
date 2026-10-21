import { describe, expect, it } from "vitest";

import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { RichDoc, RichNode, ScenarioSection } from "@/types/scenario";

const doc = (...content: RichNode[]): RichDoc => ({ type: "doc", content });

const text = (t: string): RichNode => ({ type: "paragraph", content: [{ type: "text", text: t }] });

const callout = (kind: string): RichNode => ({ type: "callout", attrs: { kind, tag: kind }, content: [text("x")] });

const section = (over: Partial<ScenarioSection> = {}, rows: Partial<ScenarioSection["rows"][number]>[] = [{}]): ScenarioSection => ({
  id: "s", title: "2.1 Мертва лицарка", played: false,
  rows: rows.map((r, i) => ({ id: `r${i}`, story: doc(text("a")), notes: doc(), ...r })),
  ...over,
});

describe("sectionIcon", () => {
  it("за замовчуванням — сцена", () => {
    expect(sectionIcon(section())).toBe("scene");
  });

  it("прив'язаний бій у будь-якому рядку — бій", () => {
    expect(sectionIcon(section({}, [{}, { battleId: "b1" }]))).toBe("battle");
  });

  it("виноска «Тіньова лінія» чи «Таємне» в розповіді — таємниця", () => {
    expect(sectionIcon(section({}, [{ story: doc(callout("shadow")) }]))).toBe("secret");
    expect(sectionIcon(section({}, [{ story: doc(callout("confide")) }]))).toBe("secret");
  });

  it("позначка secret і виноски в нотатках не роблять розділ таємницею", () => {
    const secretMark: RichNode = { type: "paragraph", content: [{ type: "text", text: "s", marks: [{ type: "secret" }] }] };

    expect(sectionIcon(section({}, [{ story: doc(secretMark), notes: doc(callout("confide")) }]))).toBe("scene");
  });

  it("виноска «Вибір гравців» у розповіді — вибір, навіть вкладена в список", () => {
    const nested: RichNode = { type: "bulletList", content: [{ type: "listItem", content: [callout("choice")] }] };

    expect(sectionIcon(section({}, [{ story: doc(nested) }]))).toBe("choice");
  });

  it("назва «Підготовка» — підготовка", () => {
    expect(sectionIcon(section({ title: "підготовка до сесії" }))).toBe("prep");
  });

  it("пріоритет: назва «Підготовка» > бій > таємниця > вибір", () => {
    expect(sectionIcon(section({ title: "Підготовка" }, [{ battleId: "b", story: doc(callout("shadow"), callout("choice")) }]))).toBe("prep");
    expect(sectionIcon(section({}, [{ battleId: "b", story: doc(callout("shadow"), callout("choice")) }]))).toBe("battle");
    expect(sectionIcon(section({}, [{ story: doc(callout("choice"), callout("shadow")) }]))).toBe("secret");
  });

  it("ручний вибір ДМ перекриває все; невідомий ключ ігнорується", () => {
    expect(sectionIcon(section({ icon: "rest" }, [{ battleId: "b" }]))).toBe("rest");
    expect(sectionIcon(section({ icon: "bogus" as never }, [{ battleId: "b" }]))).toBe("battle");
  });

  it("розділ без рядків — сцена", () => {
    expect(sectionIcon(section({}, []))).toBe("scene");
  });
});
