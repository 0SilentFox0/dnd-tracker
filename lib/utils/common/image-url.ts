export function normalizeImageUrl(src: string): string {
  try {
    const url = new URL(src);

    if (url.hostname === "static.wikia.nocookie.net") {
      // Якщо URL вже має /revision/latest та path-prefix=en - залишаємо як є
      if (
        url.pathname.includes("/revision/latest") &&
        url.searchParams.has("path-prefix")
      ) {
        return src; // Повертаємо оригінальний URL без змін
      }

      // Інакше нормалізуємо URL
      if (!url.pathname.includes("/revision/")) {
        const trimmedPath = url.pathname.replace(/\/$/, "");

        url.pathname = `${trimmedPath}/revision/latest`;
      }

      if (!url.searchParams.has("path-prefix")) {
        url.searchParams.set("path-prefix", "en");
      }
    }

    return url.toString();
  } catch {
    return src;
  }
}

const SUPABASE_PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";

export function isSupabaseStorageUrl(src: string): boolean {
  try {
    const url = new URL(src);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith(SUPABASE_PUBLIC_OBJECT_PATH)
    );
  } catch {
    return false;
  }
}

export function isHttpUrl(src: string): boolean {
  try {
    const { protocol } = new URL(src.trim());

    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
