// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { SeedQuery } from "@/lib/providers/prefetched-query-client";

const KEY = ["battle", "c1", "b1"] as const;

function Reader({ queryFn }: { queryFn: () => Promise<{ name: string }> }) {
  const { data } = useQuery({ queryKey: KEY, queryFn, staleTime: 15_000 });

  return <p>{data?.name ?? "loading"}</p>;
}

const renderWith = (data: { name: string } | null, queryFn: () => Promise<{ name: string }>, client = new QueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <PrefetchedQuery queryKey={KEY} data={data}>
        <Reader queryFn={queryFn} />
      </PrefetchedQuery>
    </QueryClientProvider>,
  );

describe("PrefetchedQuery", () => {
  afterEach(() => vi.useRealTimers());

  it("дані датуються годинником клієнта, а не сервера", () => {
    vi.useFakeTimers({ now: 5_000_000 });

    const client = new QueryClient();

    renderWith({ name: "x" }, async () => ({ name: "client" }), client);

    expect(client.getQueryState(KEY)?.dataUpdatedAt).toBe(5_000_000);
  });

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

  it("повторне монтування з даними першого HTML не затирає новішу версію з дельт", () => {
    const client = new QueryClient();

    const seed = (data: unknown) =>
      render(
        <QueryClientProvider client={client}>
          <PrefetchedQuery queryKey={KEY} data={data}>
            <span />
          </PrefetchedQuery>
        </QueryClientProvider>,
      );

    seed({ version: 3 }).unmount();
    client.setQueryData(KEY, { version: 7 });
    seed({ version: 3 });

    expect(client.getQueryData(KEY)).toEqual({ version: 7 });
  });

  it("та сама версія при повторному монтуванні не перезаписує кеш", () => {
    const client = new QueryClient();

    const cached = { version: 4, tag: "cache" };

    client.setQueryData(KEY, cached);

    render(
      <QueryClientProvider client={client}>
        <PrefetchedQuery queryKey={KEY} data={{ version: 4, tag: "html" }}>
          <span />
        </PrefetchedQuery>
      </QueryClientProvider>,
    );

    expect(client.getQueryData(KEY)).toBe(cached);
  });

  it("Back з payload router cache не затирає новіший кеш списку без version", () => {
    const client = new QueryClient();

    const seed = (data: unknown, seededAt: number) =>
      render(
        <QueryClientProvider client={client}>
          <SeedQuery queryKey={KEY} data={data} seededAt={seededAt}>
            <span />
          </SeedQuery>
        </QueryClientProvider>,
      );

    const html = [{ id: "s1", name: "Старе" }];

    seed(html, 100).unmount();
    client.setQueryData(KEY, [{ id: "s1", name: "Нове" }]);
    seed(html, 100).unmount();

    expect(client.getQueryData(KEY)).toEqual([{ id: "s1", name: "Нове" }]);

    seed([{ id: "s1", name: "З сервера" }], 200);

    expect(client.getQueryData(KEY)).toEqual([{ id: "s1", name: "З сервера" }]);
  });
});
