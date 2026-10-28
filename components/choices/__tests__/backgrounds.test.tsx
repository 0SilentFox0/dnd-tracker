// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { ChoicesEditor } from "@/components/choices/ChoicesEditor";
import { empty, refs, scores, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { BackgroundData } from "@/types/backgrounds";
import type { ChoicesState } from "@/types/choices";

const bg: BackgroundData = { id: "sage", name: "Sage", icon: null, description: null, originFeatId: "f-alert", equipmentText: "Видає ДМ", skillProficiencies: ["arcana"], toolProficiencies: ["Tools"], choices: [{ id: "asi", label: "Бонуси", kind: "abilityScore", level: 1, count: 3, points: 3, maxPerAbility: 2, abilities: ["strength", "dexterity", "wisdom"] }] };

function Harness() {
 const [data,set] = useState<ChoicesState>(empty);

 return <ChoicesEditor state={{ data,set }} refs={{ ...refs, backgroundsById: { sage: bg }, ready: true, feats: Object.values(refs.featsById), spells }} hero={{ level:1, scores, skills:{}, classMode:true }} />;
}

afterEach(cleanup);
it("selects a background, shows its origin feat and limits each ASI to two", () => {
 render(<Harness />);
 fireEvent.change(screen.getByLabelText("Передісторія"), { target:{value:"sage"} });
 expect(screen.getByText("Видає ДМ")).toBeTruthy();

 const plus=screen.getByRole("button", {name:"+1 Сила"});

 fireEvent.click(plus); fireEvent.click(plus);
 expect((plus as HTMLButtonElement).disabled).toBe(true);
 expect(screen.queryByRole("heading", {name:"Риса походження"})).toBeNull();
});
