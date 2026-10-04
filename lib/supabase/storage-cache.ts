const ONE_YEAR_SECONDS = "31536000";

/** Лише для файлів, що не змінюються під тим самим шляхом (assets/*), інакше браузери тримають стару версію рік. */
export function staticAssetUploadOptions(contentType: string) {
  return { contentType, upsert: true, cacheControl: ONE_YEAR_SECONDS };
}
