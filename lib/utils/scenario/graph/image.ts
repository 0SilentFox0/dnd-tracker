export const graphImageSrc = (image: string | null | undefined): string | null => {
  const src = image?.trim();

  return src && /^(https?:\/\/|\/)/.test(src) ? src : null;
};
