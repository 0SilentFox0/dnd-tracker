/**
 * @vitest-environment happy-dom
 */
import { cleanup,render, screen } from "@testing-library/react";
import { afterEach,describe, expect, it, vi } from "vitest";

import { SkillBasicInfo } from "@/components/skills/form/basic/SkillBasicInfo";

vi.mock("@/components/common/OptimizedImage", () => ({
  OptimizedImage: () => <span data-testid="optimized-image" />,
}));

describe("SkillBasicInfo", () => {
  afterEach(cleanup);

  it("рендерить поле назви, опису та іконки", () => {
    const data = { name: "Назва скіла", description: "Опис", icon: "", abilities: [], spellId: null, spellGroupId: null, grantedSpellId: null, mainSkillId: null };

    render(<SkillBasicInfo form={{ data, set: vi.fn() }} />);
    expect(screen.getByDisplayValue("Назва скіла")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Опис")).toBeInTheDocument();
    expect(screen.getByLabelText(/іконка/i)).toBeInTheDocument();
  });
});
