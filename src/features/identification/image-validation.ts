export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
// Native decoders may allocate source pixels before resizing.
export const IMAGE_MAX_SOURCE_PIXELS = 100_000_000;
export const IMAGE_MAX_EDGE = 2048;
// shortcut: JPEG metadata scan stops at 1 MiB; raise limit if supported files place SOF later.
const IMAGE_MAX_HEADER_BYTES = 1024 * 1024;

export type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export type ImageValidationError =
  | "empty"
  | "too-large"
  | "unsupported-type"
  | "type-mismatch"
  | "invalid-image"
  | "dimensions-too-large"
  | "decoder-unavailable";

export type ImageInspection = {
  mimeType: SupportedImageMimeType;
  width: number;
  height: number;
};

export type ImageValidation =
  | { ok: true; image: ImageInspection }
  | { ok: false; error: ImageValidationError };

const supportedTypes = new Set<SupportedImageMimeType>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const jpegFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function ascii(bytes: Uint8Array, offset: number, value: string) {
  if (offset + value.length > bytes.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

function dimensions(width: number, height: number) {
  return Number.isSafeInteger(width) &&
    Number.isSafeInteger(height) &&
    width > 0 &&
    height > 0
    ? { width, height }
    : null;
}

function pngDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 24 ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    ) ||
    !ascii(bytes, 12, "IHDR") ||
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      8,
    ) !== 13
  )
    return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return dimensions(view.getUint32(16), view.getUint32(20));
}

function jpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    if (marker === undefined) return null;
    offset += 1;
    if (marker === 0x00 || marker === 0xda || marker === 0xd9) return null;
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    )
      continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    if (jpegFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      return dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
    }

    offset += segmentLength;
  }

  return null;
}

function webpDimensions(bytes: Uint8Array) {
  if (bytes.length < 20 || !ascii(bytes, 0, "RIFF") || !ascii(bytes, 8, "WEBP"))
    return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkSize = view.getUint32(16, true);
  const chunk = ascii(bytes, 12, "VP8X")
    ? "VP8X"
    : ascii(bytes, 12, "VP8L")
      ? "VP8L"
      : ascii(bytes, 12, "VP8 ")
        ? "VP8"
        : null;

  if (!chunk) return null;

  if (chunk === "VP8X") {
    if (chunkSize < 10 || bytes.length < 30) return null;
    const width =
      1 +
      view.getUint8(24) +
      (view.getUint8(25) << 8) +
      (view.getUint8(26) << 16);
    const height =
      1 +
      view.getUint8(27) +
      (view.getUint8(28) << 8) +
      (view.getUint8(29) << 16);
    return dimensions(width, height);
  }

  if (chunk === "VP8L") {
    if (chunkSize < 5 || bytes.length < 25 || view.getUint8(20) !== 0x2f)
      return null;
    const width = 1 + view.getUint8(21) + ((view.getUint8(22) & 0x3f) << 8);
    const height =
      1 +
      (view.getUint8(22) >> 6) +
      (view.getUint8(23) << 2) +
      ((view.getUint8(24) & 0x0f) << 10);
    return dimensions(width, height);
  }

  if (
    chunkSize < 10 ||
    bytes.length < 30 ||
    view.getUint8(23) !== 0x9d ||
    view.getUint8(24) !== 0x01 ||
    view.getUint8(25) !== 0x2a
  )
    return null;
  return dimensions(
    view.getUint16(26, true) & 0x3fff,
    view.getUint16(28, true) & 0x3fff,
  );
}

export function inspectImageHeader(bytes: Uint8Array): ImageInspection | null {
  const png = pngDimensions(bytes);
  if (png) return { mimeType: "image/png", ...png };

  const jpeg = jpegDimensions(bytes);
  if (jpeg) return { mimeType: "image/jpeg", ...jpeg };

  const webp = webpDimensions(bytes);
  if (webp) return { mimeType: "image/webp", ...webp };

  return null;
}

export function validateImageMetadata({
  byteLength,
  mediaType,
  bytes,
}: {
  byteLength: number;
  mediaType: string;
  bytes: Uint8Array;
}): ImageValidation {
  if (byteLength === 0) return { ok: false, error: "empty" };
  if (byteLength > IMAGE_MAX_BYTES) return { ok: false, error: "too-large" };
  if (mediaType && !supportedTypes.has(mediaType as SupportedImageMimeType))
    return { ok: false, error: "unsupported-type" };

  const image = inspectImageHeader(bytes);
  if (!image) return { ok: false, error: "invalid-image" };
  if (mediaType && mediaType !== image.mimeType)
    return { ok: false, error: "type-mismatch" };
  if (image.width * image.height > IMAGE_MAX_SOURCE_PIXELS)
    return { ok: false, error: "dimensions-too-large" };

  return { ok: true, image };
}

export async function prepareImageFile(
  file: File,
): Promise<
  { ok: true; file: File } | { ok: false; error: ImageValidationError }
> {
  if (file.size === 0) return { ok: false, error: "empty" };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, error: "too-large" };
  if (file.type && !supportedTypes.has(file.type as SupportedImageMimeType))
    return { ok: false, error: "unsupported-type" };

  const header = new Uint8Array(
    await file.slice(0, IMAGE_MAX_HEADER_BYTES).arrayBuffer(),
  );
  const validation = validateImageMetadata({
    byteLength: file.size,
    mediaType: file.type,
    bytes: header,
  });
  if (!validation.ok) return validation;
  if (typeof createImageBitmap !== "function")
    return { ok: false, error: "decoder-unavailable" };

  const { width, height } = validation.image;
  const resize = Math.max(width, height) > IMAGE_MAX_EDGE;
  const options: ImageBitmapOptions = { imageOrientation: "from-image" };
  if (resize) {
    // The shorter side keeps EXIF-rotated photos within the same bound.
    options.resizeWidth = Math.max(
      1,
      Math.floor(
        (Math.min(width, height) * IMAGE_MAX_EDGE) / Math.max(width, height),
      ),
    );
    options.resizeQuality = "high";
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, options);
  } catch {
    return { ok: false, error: "invalid-image" };
  }

  let canvas: HTMLCanvasElement | undefined;
  try {
    if (
      !dimensions(bitmap.width, bitmap.height) ||
      Math.max(bitmap.width, bitmap.height) > IMAGE_MAX_EDGE
    ) {
      return { ok: false, error: "dimensions-too-large" };
    }
    if (!resize) return { ok: true, file };

    canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return { ok: false, error: "decoder-unavailable" };
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const output = canvas;
    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return { ok: false, error: "invalid-image" };
    return {
      ok: true,
      file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
        type: blob.type,
      }),
    };
  } catch {
    return { ok: false, error: "invalid-image" };
  } finally {
    bitmap.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
export function imageFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (let index = 0; index < data.items.length; index += 1) {
    const item = data.items[index];
    if (item?.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return null;
}
