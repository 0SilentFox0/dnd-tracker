import sharp from "sharp";

export const toWebp = (png: Buffer, size: number) => sharp(png).resize(size, size, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
