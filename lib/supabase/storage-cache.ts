const ONE_YEAR_SECONDS = '31536000';

/** Only for files that never change under the same path (assets/*); otherwise browsers keep the old version for a year. */
export function staticAssetUploadOptions(contentType: string) {
    return { contentType, upsert: true, cacheControl: ONE_YEAR_SECONDS };
}
