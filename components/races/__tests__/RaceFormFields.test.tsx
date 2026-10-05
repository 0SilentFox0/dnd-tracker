// @vitest-environment happy-dom
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RaceFormFields } from "@/components/races/RaceFormFields";
import type { RaceFormData } from "@/types/races";

function Harness() {
  const [data, setData] = useState<RaceFormData>({ name: "Ельф", availableSkills: [], disabledSkills: [], abilities: [] });

  return (
    <QueryClientProvider client={new QueryClient()}>
      <RaceFormFields campaignId="c1" formData={data} setFormData={setData} mainSkills={[]} />
      <output data-testid="n">{data.abilities.length}</output>
    </QueryClientProvider>
  );
}

describe("RaceFormFields", () => {
  it("секція «Вміння в бою» додає вміння з шаблону", () => {
    render(<Harness />);

    expect(screen.getByText("Вміння в бою")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Вміння" }));
    fireEvent.click(screen.getByText("Опір / імунітет"));

    expect(screen.getByTestId("n").textContent).toBe("1");
  });
});
