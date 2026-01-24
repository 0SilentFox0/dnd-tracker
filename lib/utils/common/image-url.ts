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
