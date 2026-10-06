/** Body of a route handler's response for server pages that reuse it; null on any error status. */
export async function readOkJson<T>(response: Response): Promise<T | null> {
  return response.ok ? ((await response.json()) as T) : null;
}
