import { describe, expect, it, vi } from "vitest";
import {
  IMAGE_MAX_BYTES,
  IMAGE_MAX_EDGE,
  IMAGE_MAX_SOURCE_PIXELS,
  imageFromClipboard,
  prepareImageFile,
  validateImageMetadata,
} from "../../src/features/identification/image-validation";

function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

function jpegHeader(width: number, height: number) {
  return Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    ...Array(12).fill(0),
  ]);
}

function webpHeader(width: number, height: number) {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70]);
  new DataView(bytes.buffer).setUint32(4, 22, true);
  bytes.set([87, 69, 66, 80, 86, 80, 56, 88], 8);
  new DataView(bytes.buffer).setUint32(16, 10, true);
  bytes[24] = (width - 1) & 0xff;
  bytes[25] = ((width - 1) >> 8) & 0xff;
  bytes[26] = ((width - 1) >> 16) & 0xff;
  bytes[27] = (height - 1) & 0xff;
  bytes[28] = ((height - 1) >> 8) & 0xff;
  bytes[29] = ((height - 1) >> 16) & 0xff;
  return bytes;
}

describe("image metadata validation", () => {
  it.each([
    {
      label: "PNG",
      bytes: pngHeader(800, 600),
      mediaType: "image/png",
      width: 800,
      height: 600,
    },
    {
      label: "JPEG",
      bytes: jpegHeader(1200, 900),
      mediaType: "image/jpeg",
      width: 1200,
      height: 900,
    },
    {
      label: "WebP",
      bytes: webpHeader(640, 480),
      mediaType: "image/webp",
      width: 640,
      height: 480,
    },
  ])(
    "accepts valid $label headers and dimensions",
    ({ bytes, mediaType, width, height }) => {
      expect(
        validateImageMetadata({ byteLength: bytes.length, mediaType, bytes }),
      ).toEqual({
        ok: true,
        image: { mimeType: mediaType, width, height },
      });
    },
  );

  it("rejects content that disagrees with reported MIME type", () => {
    expect(
      validateImageMetadata({
        byteLength: 24,
        mediaType: "image/png",
        bytes: jpegHeader(10, 10),
      }),
    ).toEqual({ ok: false, error: "type-mismatch" });
  });

  it("rejects unsupported formats and malformed image headers", () => {
    expect(
      validateImageMetadata({
        byteLength: 10,
        mediaType: "image/gif",
        bytes: new Uint8Array(10),
      }),
    ).toEqual({ ok: false, error: "unsupported-type" });
    expect(
      validateImageMetadata({
        byteLength: 10,
        mediaType: "image/png",
        bytes: new Uint8Array(10),
      }),
    ).toEqual({ ok: false, error: "invalid-image" });
  });

  it("accepts a 48-megapixel photo for automatic resizing", () => {
    expect(
      validateImageMetadata({
        byteLength: 2_000_000,
        mediaType: "image/jpeg",
        bytes: jpegHeader(8_000, 6_000),
      }),
    ).toEqual({
      ok: true,
      image: { mimeType: "image/jpeg", width: 8_000, height: 6_000 },
    });
  });

  it("rejects decompression-bomb dimensions before decoding", () => {
    expect(
      validateImageMetadata({
        byteLength: 24,
        mediaType: "image/png",
        bytes: pngHeader(
          5_000,
          Math.floor(IMAGE_MAX_SOURCE_PIXELS / 5_000) + 1,
        ),
      }),
    ).toEqual({ ok: false, error: "dimensions-too-large" });
  });

  it("accepts the exact source-memory safety limit", () => {
    const width = 5_000;
    const height = IMAGE_MAX_SOURCE_PIXELS / width;
    expect(
      validateImageMetadata({
        byteLength: 24,
        mediaType: "image/png",
        bytes: pngHeader(width, height),
      }),
    ).toEqual({
      ok: true,
      image: { mimeType: "image/png", width, height },
    });
  });

  it("enforces empty and byte limits before header parsing", () => {
    expect(
      validateImageMetadata({
        byteLength: 0,
        mediaType: "image/png",
        bytes: new Uint8Array(),
      }),
    ).toEqual({ ok: false, error: "empty" });
    expect(
      validateImageMetadata({
        byteLength: IMAGE_MAX_BYTES + 1,
        mediaType: "image/png",
        bytes: new Uint8Array(),
      }),
    ).toEqual({ ok: false, error: "too-large" });
  });
});

it("extracts the first supported image from clipboard data", () => {
  const file = new File([pngHeader(1, 1)], "clipboard.png", {
    type: "image/png",
  });
  const getAsFile = vi.fn(() => file);
  const data = {
    items: [
      { kind: "string", type: "text/plain", getAsFile: vi.fn(() => null) },
      { kind: "file", type: "image/png", getAsFile },
    ],
  } as unknown as DataTransfer;

  expect(imageFromClipboard(data)).toBe(file);
  expect(getAsFile).toHaveBeenCalledOnce();
});

it("ignores non-image clipboard data", () => {
  const getAsFile = vi.fn(() => null);
  const data = {
    items: [{ kind: "string", type: "text/plain", getAsFile }],
  } as unknown as DataTransfer;

  expect(imageFromClipboard(data)).toBeNull();
  expect(getAsFile).not.toHaveBeenCalled();
});

it("handles missing clipboard data", () => {
  expect(imageFromClipboard(null)).toBeNull();
});

it("rejects and releases a bitmap when the decoder ignores the resize bound", async () => {
  const close = vi.fn();
  vi.stubGlobal("createImageBitmap", async () => ({
    width: IMAGE_MAX_EDGE + 1,
    height: 1,
    close,
  }));
  try {
    const file = new File([jpegHeader(8_000, 6_000)], "large.jpg", {
      type: "image/jpeg",
    });
    expect(await prepareImageFile(file)).toEqual({
      ok: false,
      error: "dimensions-too-large",
    });
    expect(close).toHaveBeenCalledOnce();
  } finally {
    vi.unstubAllGlobals();
  }
});
