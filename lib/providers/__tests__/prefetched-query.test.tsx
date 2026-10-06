// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PrefetchedQuery } from "@/lib/providers/prefetched-query";

const KEY = ["battle", "c1", "b1"] as const;

function Reader({ queryFn }: { queryFn: () => Promise<{ name: string }> }) {
  const { data } = useQuery({ queryKey: KEY, queryFn, staleTime: 15_000 });

  return <p>{data?.name ?? "loading"}</p>;
}

const renderWith = (data: { name: string } | null, queryFn: () => Promise<{ name: string }>) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PrefetchedQuery queryKey={KEY} data={data}>
        <Reader queryFn={queryFn} />
      </PrefetchedQuery>
    </QueryClientProvider>,
  );

describe("PrefetchedQuery", () => {
  it("дані з сервера видно одразу, а свіжий кеш не перезапитується на mount", () => {
    const queryFn = vi.fn(async () => ({ name: "client" }));

    renderWith({ name: "Бій у таверні" }, queryFn);

    expect(screen.getByText("Бій у таверні")).toBeInTheDocument();
    expect(queryFn).not.toHaveBeenCalled();
  });

  it("без даних (помилка доступу на сервері) — клієнт вантажить як раніше", async () => {
    const queryFn = vi.fn(async () => ({ name: "client" }));

    renderWith(null, queryFn);

    expect(await screen.findByText("client")).toBeInTheDocument();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
