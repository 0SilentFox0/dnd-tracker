import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseBody } from "../parse-body";

import { API_ERRORS } from "@/lib/constants/api-errors";

const schema = z.object({ name: z.string().min(1) });

const post = (body: string) => new Request("http://localhost/api", { method: "POST", body });

describe("parseBody", () => {
  it("валідне тіло — повертає дані", async () => {
    expect(await parseBody(schema, post(JSON.stringify({ name: "Ельф" })))).toEqual({ name: "Ельф" });
  });

  it("кривий JSON — 400 замість 500", async () => {
    const res = await parseBody(schema, post("{not json"));

    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(400);
    expect(await (res as NextResponse).json()).toEqual({ error: API_ERRORS.INVALID_JSON });
  });

  it("помилка схеми — 400 з error і issues", async () => {
    const res = (await parseBody(schema, post(JSON.stringify({ name: "" })))) as NextResponse;

    expect(res.status).toBe(400);

    const body = await res.json();

    expect(body.error).toBe(API_ERRORS.INVALID_BODY);
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues[0].path).toEqual(["name"]);
  });

  it("власне повідомлення про помилку схеми", async () => {
    const res = (await parseBody(schema, post("{}"), "Некоректні цілі")) as NextResponse;

    expect((await res.json()).error).toBe("Некоректні цілі");
  });
});
