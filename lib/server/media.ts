import sharp from "sharp";
import { HttpError } from "./database";
export async function imageData(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024)
    throw new HttpError(400, "Select a photograph under 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new HttpError(400, "Use a JPG, PNG or WebP photograph.");
  try {
    const data = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25000000,
    })
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    return data;
  } catch {
    throw new HttpError(
      400,
      "The photograph could not be decoded. Choose a valid image.",
    );
  }
}
export async function formData(request: Request) {
  const size = Number(request.headers.get("content-length"));
  if (!Number.isFinite(size) || size < 1)
    throw new HttpError(411, "A content length is required for uploads.");
  if (size > 6 * 1024 * 1024)
    throw new HttpError(
      413,
      "Upload is too large. Maximum photograph size is 5 MB.",
    );
  return request.formData();
}
