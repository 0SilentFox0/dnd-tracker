import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ actor: null as unknown }));

const exampleCsv = vi.hoisted(() => vi.fn(async () => "﻿Назва\r\nА\r\n"));

const exportCsv = vi.hoisted(() => vi.fn(async () => "﻿Назва\r\nБ\r\n"));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn(async () => state.actor) }));
vi.mock("@/lib/server/content/import/example", () => ({ exampleCsv }));
vi.mock("@/lib/server/content/import/export", () => ({ exportCsv }));

import { GET as getExport } from "@/app/api/campaigns/[id]/content-export/[kind]/route";
import { GET as getExample } from "@/app/api/campaigns/[id]/content-import/[kind]/example.csv/route";
import { resolveActor } from "@/lib/utils/api/actor";

const actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const call = (handler: typeof getExport, kind: string) => handler(new Request("http://x"), { params: Promise.resolve({ id: "c1", kind }) }) as Promise<NextResponse>;

describe("CSV-роути", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.actor = actor;
  });

  it.each([
    ["example", getExample, "units-example.csv", "﻿Назва\r\nА\r\n"],
    ["export", getExport, "units.csv", "﻿Назва\r\nБ\r\n"],
  ] as const)("%s: text/csv, attachment, право content:read ДМ", async (_name, handler, fileName, body) => {
    const res = await call(handler, "units");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe(`attachment; filename="${fileName}"`);
    expect(Buffer.from(await res.arrayBuffer()).toString("utf8")).toBe(body);
    expect(resolveActor).toHaveBeenCalledWith(expect.any(Request), "c1", { access: "dm", scope: "content:read" });
  });

  it("невідомий вид — 404", async () => {
    expect((await call(getExport, "tracks")).status).toBe(404);
    expect(exportCsv).not.toHaveBeenCalled();
  });
});
