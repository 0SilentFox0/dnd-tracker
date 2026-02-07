/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { SkillBasicInfo } from "@/components/skills/form/basic/SkillBasicInfo";

vi.mock("@/components/common/OptimizedImage", () => ({
  OptimizedImage: () => <span data-testid="optimized-image" />,
}));

describe("SkillBasicInfo", () => {
  afterEach(cleanup);

  it("рендерить поле назви, опису та іконки", () => {
    const setters = {
      setName: vi.fn(),
      setDescription: vi.fn(),
      setIcon: vi.fn(),
    };
    render(
      <SkillBasicInfo
        basicInfo={{
          name: "Назва скіла",
          description: "Опис",
          icon: "",
          setters,
        }}
      />,
    );
    expect(screen.getByDisplayValue("Назва скіла")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Опис")).toBeInTheDocument();
    expect(screen.getByLabelText(/іконка/i)).toBeInTheDocument();
  });
});
