// @vitest-environment happy-dom
import { cleanup,render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/hooks/feats", () => ({ useFeats: () => ({ data: [{ id: "origin", name: "Origin", type: "origin" }, { id: "general", name: "General", type: "general" }] }) }));
vi.mock("@/lib/hooks/backgrounds", () => ({ useUpdateBackground: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/choices/ChoiceListEditor", () => ({ ChoiceListEditor: () => null }));
import { BackgroundForm } from "@/components/backgrounds/BackgroundForm";
afterEach(cleanup);
it("allows only origin feats and explains manual equipment", () => {
 render(<BackgroundForm campaignId="c" background={{ id:"b",name:"Sage",icon:null,description:null,choices:[],skillProficiencies:[],toolProficiencies:[],originFeatId:null,equipmentText:null }} />);
 expect(screen.getByRole("option", {name:"Origin"})).toBeTruthy();
 expect(screen.queryByRole("option", {name:"General"})).toBeNull();
 expect(screen.getByText(/Спорядження й гроші видає ДМ вручну/)).toBeTruthy();
});
