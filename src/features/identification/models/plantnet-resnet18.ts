import { z } from "zod";
import type { InferenceSession } from "onnxruntime-web/wasm";
import type {
  ModelAAdapter,
  ModelAProgress,
  ModelAResult,
  ModelCandidate,
} from "../domain/types";
import { plantNetManifest } from "./plantnet-resnet18.manifest";

export const plantNetLabelSchema = z
  .object({
    classIndex: z.number().int().nonnegative(),
    plantnetSpeciesId: z.string().regex(/^\d+$/),
    scientificName: z.string().trim().min(1),
    canonicalTaxonId: z.string().regex(/^\d+$/).optional(),
  })
  .strict();
export const plantNetLabelsSchema = z.array(plantNetLabelSchema);
export type PlantNetLabel = z.infer<typeof plantNetLabelSchema>;

const MODEL_TIMEOUT_MS = 120_000;
const MAX_CANVAS_DIMENSION = 16_384;
const CROP_SIZE = 224;

function loadBrowserRuntime() {
  // Load browser-only WASM workers only after a visitor selects a photo.
  return import("onnxruntime-web/wasm");
}

const allowedModelAssetPaths = new Set([
  plantNetManifest.labelsPath,
  plantNetManifest.artifactUrl,
]);
function localModelAssetUrl(assetPath: string) {
  if (!allowedModelAssetPaths.has(assetPath)) {
    throw new Error("Model asset path is not allowlisted");
  }
  const url = new URL(assetPath, window.location.origin);
  if (url.origin !== window.location.origin) {
    throw new Error("Model assets must use the current origin");
  }
  return url.href;
}

export async function sha256Hex(bytes: BufferSource) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function roundHalfToEven(value: number) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction === 0.5) return lower % 2 === 0 ? lower : lower + 1;
  return Math.round(value);
}

export function rgbaToNchw(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    rgba.length !== width * height * 4
  ) {
    throw new RangeError("Invalid RGBA image dimensions");
  }

  const pixels = width * height;
  const tensor = new Float32Array(pixels * 3);
  const mean = plantNetManifest.input.mean;
  const std = plantNetManifest.input.std;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4;
    tensor[pixel] = (rgba[offset]! / 255 - mean[0]) / std[0];
    tensor[pixels + pixel] = (rgba[offset + 1]! / 255 - mean[1]) / std[1];
    tensor[pixels * 2 + pixel] = (rgba[offset + 2]! / 255 - mean[2]) / std[2];
  }

  return tensor;
}

export function rankPlantNetLogits(
  logits: ArrayLike<number>,
  labels: readonly PlantNetLabel[],
): ModelCandidate[] {
  if (logits.length !== labels.length || logits.length === 0) {
    throw new RangeError("Logit count does not match label count");
  }

  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < logits.length; index += 1) {
    const value = logits[index];
    if (value === undefined || !Number.isFinite(value)) {
      throw new RangeError("Model returned a non-finite logit");
    }
    if (value > maximum) maximum = value;
  }

  let denominator = 0;
  for (let index = 0; index < logits.length; index += 1) {
    denominator += Math.exp(logits[index]! - maximum);
  }
  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw new RangeError("Model returned an invalid logit vector");
  }

  const topIndexes: number[] = [];
  for (let index = 0; index < logits.length; index += 1) {
    const value = logits[index]!;
    let position = 0;
    while (position < topIndexes.length) {
      const currentIndex = topIndexes[position]!;
      const currentValue = logits[currentIndex]!;
      if (
        currentValue > value ||
        (currentValue === value && currentIndex < index)
      ) {
        position += 1;
      } else {
        break;
      }
    }
    if (position >= 5) continue;
    topIndexes.splice(position, 0, index);
    if (topIndexes.length > 5) topIndexes.pop();
  }

  return topIndexes.map((index) => {
    const label = labels[index];
    if (!label) throw new RangeError("Model output index has no label");
    return {
      modelClassIndex: label.classIndex,
      scientificName: label.scientificName,
      ...(label.canonicalTaxonId
        ? { canonicalTaxonId: label.canonicalTaxonId }
        : {}),
      modelScore: Math.exp(logits[index]! - maximum) / denominator,
      inEncyclopedia: false,
    };
  });
}

function preprocessImage(image: ImageBitmap) {
  const { width, height } = image;
  const shortSide = Math.min(width, height);
  if (shortSide < 1) throw new RangeError("Image has no pixels");

  const longSide = Math.max(width, height);
  const resizedLongSide = Math.floor(
    (longSide * plantNetManifest.input.resizeShortSide!) / shortSide,
  );
  const resizedWidth = width < height ? 256 : resizedLongSide;
  const resizedHeight = height < width ? 256 : resizedLongSide;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  let cropLeft: number;
  let cropTop: number;
  if (Math.max(resizedWidth, resizedHeight) > MAX_CANVAS_DIMENSION) {
    canvas.width = 256;
    canvas.height = 256;
    context.drawImage(
      image,
      (width - shortSide) / 2,
      (height - shortSide) / 2,
      shortSide,
      shortSide,
      0,
      0,
      256,
      256,
    );
    cropLeft = 16;
    cropTop = 16;
  } else {
    canvas.width = resizedWidth;
    canvas.height = resizedHeight;
    context.drawImage(image, 0, 0, resizedWidth, resizedHeight);
    cropLeft = roundHalfToEven((resizedWidth - CROP_SIZE) / 2);
    cropTop = roundHalfToEven((resizedHeight - CROP_SIZE) / 2);
  }

  const pixels = context.getImageData(cropLeft, cropTop, CROP_SIZE, CROP_SIZE);
  return rgbaToNchw(pixels.data, CROP_SIZE, CROP_SIZE);
}

export function createPlantNetResNet18Adapter(): ModelAAdapter {
  let session: InferenceSession | null = null;
  let labels: PlantNetLabel[] | null = null;
  let pendingLoad: Promise<void> | null = null;
  let loadController: AbortController | null = null;
  let disposed = false;

  async function load() {
    if (disposed) throw new Error("Model adapter is disposed");
    if (session && labels) return;
    if (pendingLoad) return pendingLoad;

    pendingLoad = (async () => {
      const labelResponse = await fetch(
        localModelAssetUrl(plantNetManifest.labelsPath),
        { cache: "no-cache" },
      );
      if (!labelResponse.ok) throw new Error("Label file unavailable");
      const parsedLabels = plantNetLabelsSchema.parse(
        await labelResponse.json(),
      );
      if (parsedLabels.length !== plantNetManifest.output.classCount) {
        throw new Error("Label count does not match the model");
      }

      let previousId = -1;
      for (const [index, label] of parsedLabels.entries()) {
        const numericId = Number(label.plantnetSpeciesId);
        if (
          label.classIndex !== index ||
          !Number.isSafeInteger(numericId) ||
          numericId <= previousId
        ) {
          throw new Error("Label order is invalid");
        }
        previousId = numericId;
      }
      for (const supported of plantNetManifest.supportedRimbaSpecies) {
        const label = parsedLabels[supported.classIndex];
        if (
          label?.plantnetSpeciesId !== supported.modelSpeciesId ||
          label.scientificName !== supported.scientificName ||
          label.canonicalTaxonId !== supported.canonicalTaxonId
        ) {
          throw new Error("RIMBA taxon mapping does not match the label file");
        }
      }

      const ort = await loadBrowserRuntime();
      ort.env.wasm.wasmPaths = `/ai/runtime/onnxruntime-web/${plantNetManifest.runtimeVersion}/`;
      ort.env.wasm.proxy = true;
      const controller = new AbortController();
      loadController = controller;
      const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
      let bytes: ArrayBuffer;
      try {
        const response = await fetch(
          localModelAssetUrl(plantNetManifest.artifactUrl),
          {
            cache: "force-cache",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Model file unavailable");
        bytes = await response.arrayBuffer();
      } finally {
        clearTimeout(timeout);
        loadController = null;
      }
      if (bytes.byteLength !== plantNetManifest.byteSize) {
        throw new Error("Model file size does not match the manifest");
      }
      if ((await sha256Hex(bytes)) !== plantNetManifest.sha256) {
        throw new Error("Model file hash does not match the manifest");
      }

      const created = await ort.InferenceSession.create(bytes, {
        executionProviders: ["wasm"],
      });
      if (
        created.inputNames.length !== 1 ||
        created.inputNames[0] !== plantNetManifest.input.name ||
        created.outputNames.length !== 1 ||
        created.outputNames[0] !== plantNetManifest.output.name
      ) {
        await created.release();
        throw new Error("Model tensor names do not match the manifest");
      }
      if (disposed) {
        await created.release();
        return;
      }

      session = created;
      labels = parsedLabels;
    })().catch((error: unknown) => {
      pendingLoad = null;
      throw error;
    });

    return pendingLoad;
  }

  return {
    id: plantNetManifest.id,
    mode: "plant",
    isAvailable: () =>
      !disposed &&
      globalThis.WebAssembly !== undefined &&
      globalThis.fetch !== undefined &&
      globalThis.document !== undefined &&
      globalThis.crypto?.subtle !== undefined,
    load,
    async predict(
      image: ImageBitmap,
      onProgress?: (stage: ModelAProgress) => void,
    ) {
      await load();
      const activeSession = session;
      const activeLabels = labels;
      const ort = await loadBrowserRuntime();
      if (!activeSession || !activeLabels || disposed) {
        throw new Error("Plant model is unavailable");
      }

      onProgress?.("preprocessing");
      const input = preprocessImage(image);
      onProgress?.("running");
      const startedAt = performance.now();
      const output = await activeSession.run({
        [plantNetManifest.input.name]: new ort.Tensor("float32", input, [
          1,
          3,
          plantNetManifest.input.height,
          plantNetManifest.input.width,
        ]),
      });
      const elapsedMs = performance.now() - startedAt;
      const logits = output[plantNetManifest.output.name];
      if (
        !logits ||
        logits.type !== "float32" ||
        !(logits.data instanceof Float32Array) ||
        logits.data.length !== plantNetManifest.output.classCount ||
        logits.dims.length !== 2 ||
        logits.dims[0] !== 1 ||
        logits.dims[1] !== plantNetManifest.output.classCount
      ) {
        throw new Error("Model returned an unexpected output tensor");
      }

      return {
        modelId: plantNetManifest.id,
        modelRevision: plantNetManifest.revision,
        mode: "plant",
        candidates: rankPlantNetLogits(logits.data, activeLabels),
        elapsedMs,
        scoreInterpretation: "uncalibrated",
        noticeCodes: ["uncalibrated-softmax", "open-set-not-evaluated"],
      } satisfies ModelAResult;
    },
    async dispose() {
      disposed = true;
      loadController?.abort();
      const activeLoad = pendingLoad;
      if (activeLoad) await activeLoad.catch(() => undefined);
      await session?.release();
      session = null;
      labels = null;

      pendingLoad = null;
      loadController = null;
    },
  };
}
