// @vitest-environment happy-dom
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RaceFormFields } from "@/components/races/RaceFormFields";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { RaceFormData } from "@/types/races";

function Harness() {
  const [data, setData] = useState<RaceFormData>({ name: "Ельф", icon: "", availableSkills: [], disabledSkills: [], abilities: [] });

  return (
    <QueryClientProvider client={new QueryClient()}>
      <RaceFormFields campaignId="c1" formData={data} setFormData={setData} mainSkills={[]} />
      <output data-testid="n">{data.abilities.length}</output>
      <output data-testid="icon">{data.icon}</output>
    </QueryClientProvider>
  );
}

describe("RaceFormFields", () => {
  afterEach(cleanup);

  it("секція «Вміння в бою» додає вміння з шаблону", () => {
    renderWithConfirm(<Harness />);

    expect(screen.getByText("Вміння в бою")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Вміння" }));
    fireEvent.click(screen.getByText("Опір / імунітет"));

    expect(screen.getByTestId("n").textContent).toBe("1");
  });

  it("іконка раси: URL записується у форму", () => {
    renderWithConfirm(<Harness />);

    fireEvent.change(screen.getByPlaceholderText("URL іконки раси або завантажте файл"), { target: { value: "https://x/elf.png" } });

    expect(screen.getByTestId("icon").textContent).toBe("https://x/elf.png");
  });
});
