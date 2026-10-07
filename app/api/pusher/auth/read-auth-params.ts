export type PusherAuthParams = { socket_id?: unknown; channel_name?: unknown };

/** pusher-js (ajax transport) sends a form, not JSON; null means a malformed JSON body. */
export async function readAuthParams(request: Request): Promise<PusherAuthParams | null> {
  if (request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    const form = new URLSearchParams(await request.text());

    return { socket_id: form.get("socket_id") ?? undefined, channel_name: form.get("channel_name") ?? undefined };
  }

  try {
    return (await request.json()) as PusherAuthParams;
  } catch {
    return null;
  }
}
