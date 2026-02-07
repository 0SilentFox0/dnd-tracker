/**
 * Хелпери для тестування API route handlers (NextResponse).
 */
import { NextResponse } from "next/server";

export async function getResponseStatus(response: NextResponse): Promise<number> {
  return response.status;
}

export async function getResponseJson<T = unknown>(
  response: NextResponse,
): Promise<T> {
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function createRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}
