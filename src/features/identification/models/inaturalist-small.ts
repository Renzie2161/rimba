import { z } from "zod";
import type * as tfjsCore from "@tensorflow/tfjs-core";
import type * as tfjsTFLite from "@tensorflow/tfjs-tflite";
import type { TFLiteModel } from "@tensorflow/tfjs-tflite";
import type {
  ModelAAdapter,
  ModelAResult,
  ModelCandidate,
} from "../domain/types";
import { iNaturalistSmallManifest } from "./inaturalist-small.manifest";

const MODEL_TIMEOUT_MS = 120_000;
const IMAGE_SIZE = 299;
const CSV_COLUMNS = [
  "parent_taxon_id",
  "taxon_id",
  "rank_level",
  "leaf_class_id",
  "iconic_class_id",
  "spatial_class_id",
  "spatial_threshold",
  "name",
] as const;

const labelSchema = z
  .object({
    classIndex: z.number().int().nonnegative(),
    taxonId: z.string().regex(/^\d+$/),
    rankLevel: z.number().finite(),
    scientificName: z.string().trim().min(1),
  })
  .strict();

export type INaturalistTaxonomyLabel = z.infer<typeof labelSchema>;

type Runtime = Pick<typeof tfjsTFLite, "loadTFLiteModel"> &
  Pick<typeof tfjsCore, "tensor4d">;

let runtimePromise: Promise<Runtime> | null = null;

function loadRuntime() {
  if (!runtimePromise) {
    // Keep animal-only TFLite and TFJS code out of the plant identification bundle.
    runtimePromise = (async () => {
      const tf = await import("@tensorflow/tfjs-core");
      await import("@tensorflow/tfjs-backend-cpu");
      await tf.setBackend("cpu");
      await tf.ready();
      const tflite =
        await import("@tensorflow/tfjs-tflite/dist/tf-tflite.fesm.js");
      tflite.setWasmPath("/ai/runtime/tfjs-tflite/0.0.1-alpha.10/");
      return {
        loadTFLiteModel: tflite.loadTFLiteModel,
        tensor4d: tf.tensor4d,
      };
    })().catch((error: unknown) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === undefined) continue;
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("Unclosed quoted field in iNaturalist taxonomy");
  if (row.length > 0 || field.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseINaturalistTaxonomyCsv(
  csv: string,
  expectedClassCount = iNaturalistSmallManifest.output.classCount,
): INaturalistTaxonomyLabel[] {
  const [header, ...rows] = parseCsvRows(csv);
  if (!header || header.join(",") !== CSV_COLUMNS.join(",")) {
    throw new Error("Unexpected iNaturalist taxonomy columns");
  }

  const labels = rows
    .filter((row) => row.some((value) => value.length > 0))
    .filter((row) => row[3] !== undefined && row[3] !== "")
    .map((row) => {
      if (row.length !== CSV_COLUMNS.length) {
        throw new Error("Malformed iNaturalist taxonomy row");
      }
      return labelSchema.parse({
        classIndex: Number(row[3]),
        taxonId: row[1],
        rankLevel: Number(row[2]),
        scientificName: row[7],
      });
    })
    .sort((left, right) => left.classIndex - right.classIndex);

  if (
    labels.length !== expectedClassCount ||
    labels.some((label, index) => label.classIndex !== index) ||
    new Set(labels.map(({ taxonId }) => taxonId)).size !== labels.length
  ) {
    throw new Error("iNaturalist taxonomy does not match model output classes");
  }
  return labels;
}

export function rankINaturalistScores(
  scores: ArrayLike<number>,
  labels: readonly INaturalistTaxonomyLabel[],
): ModelCandidate[] {
  if (
    scores.length !== labels.length ||
    labels.some((label, index) => label.classIndex !== index)
  ) {
    throw new Error("iNaturalist scores do not match taxonomy class order");
  }

  const ranked: ModelCandidate[] = [];
  for (let index = 0; index < scores.length; index += 1) {
    const score = scores[index];
    const label = labels[index];
    if (
      score === undefined ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 1 ||
      !label
    ) {
      throw new Error("iNaturalist model returned an invalid score");
    }
    ranked.push({
      modelClassIndex: label.classIndex,
      scientificName: label.scientificName,
      modelScore: score,
      inEncyclopedia: false,
    });
  }

  return ranked
    .sort(
      (left, right) =>
        right.modelScore - left.modelScore ||
        left.modelClassIndex - right.modelClassIndex,
    )
    .slice(0, 5);
}

function localAssetUrl(path: string) {
  const allowedPaths = new Set([
    iNaturalistSmallManifest.artifactUrl,
    iNaturalistSmallManifest.labelsPath,
  ]);
  if (!allowedPaths.has(path)) {
    throw new Error("Unapproved iNaturalist asset path");
  }
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) {
    throw new Error("iNaturalist assets must load from this origin");
  }
  return url;
}

async function fetchAsset(path: string, cache: RequestCache) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch(localAssetUrl(path), {
      cache,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("iNaturalist model asset unavailable");
    return await response.arrayBuffer();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function sha256Hex(bytes: BufferSource) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function validateTensorMetadata(model: TFLiteModel) {
  const input = model.inputs[0];
  const output = model.outputs[0];
  if (
    model.inputs.length !== 1 ||
    !input ||
    !input.shape ||
    input.shape.join(",") !== `1,${IMAGE_SIZE},${IMAGE_SIZE},3` ||
    input.dtype !== "float32" ||
    model.outputs.length !== 1 ||
    !output ||
    !output.shape ||
    output.shape.join(",") !==
      `1,${iNaturalistSmallManifest.output.classCount}` ||
    output.dtype !== "float32"
  ) {
    throw new Error("iNaturalist checkpoint tensor metadata is unsupported");
  }
}

function releaseTFLiteModel(model: TFLiteModel) {
  // The pinned wrapper hides its runner's documented WASM cleanup method.
  // SAFETY: v0.0.1-alpha.10 stores its documented BaseTaskLibrary runner here.
  const wrapper = model as unknown as {
    modelRunner: { cleanUp(): void };
  };
  wrapper.modelRunner.cleanUp();
}

function inputTensorData(image: ImageBitmap) {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas image processing is unavailable");

  const cropSize = Math.min(image.width, image.height);
  const cropX = (image.width - cropSize) / 2;
  const cropY = (image.height - cropSize) / 2;
  context.drawImage(
    image,
    cropX,
    cropY,
    cropSize,
    cropSize,
    0,
    0,
    IMAGE_SIZE,
    IMAGE_SIZE,
  );

  const pixels = context.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE).data;
  const rgb = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
  for (let source = 0, target = 0; source < pixels.length; source += 4) {
    rgb[target] = pixels[source] ?? 0;
    rgb[target + 1] = pixels[source + 1] ?? 0;
    rgb[target + 2] = pixels[source + 2] ?? 0;
    target += 3;
  }
  return rgb;
}

function isTFLiteOutput(value: unknown): value is tfjsCore.Tensor {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    typeof value.data === "function" &&
    "dispose" in value &&
    typeof value.dispose === "function"
  );
}

export function createINaturalistSmallAdapter(): ModelAAdapter {
  let model: TFLiteModel | null = null;
  let labels: INaturalistTaxonomyLabel[] | null = null;

  return {
    id: iNaturalistSmallManifest.id,
    mode: "animal",
    isAvailable() {
      return (
        typeof window !== "undefined" &&
        typeof WebAssembly !== "undefined" &&
        typeof crypto !== "undefined" &&
        typeof crypto.subtle !== "undefined"
      );
    },
    async load() {
      if (model && labels) return;
      if (!this.isAvailable()) {
        throw new Error("WebAssembly or secure SHA-256 is unavailable");
      }

      const [runtime, labelBytes, modelBytes] = await Promise.all([
        loadRuntime(),
        fetchAsset(iNaturalistSmallManifest.labelsPath, "no-cache"),
        fetchAsset(iNaturalistSmallManifest.artifactUrl, "force-cache"),
      ]);
      if (
        (await sha256Hex(labelBytes)) !==
          iNaturalistSmallManifest.labelSourceSha256 ||
        modelBytes.byteLength !== iNaturalistSmallManifest.byteSize ||
        (await sha256Hex(modelBytes)) !== iNaturalistSmallManifest.sha256
      ) {
        throw new Error("iNaturalist model or taxonomy integrity check failed");
      }

      const parsedLabels = parseINaturalistTaxonomyCsv(
        new TextDecoder("utf-8", { fatal: true }).decode(labelBytes),
      );
      const loadedModel = await runtime.loadTFLiteModel(modelBytes, {
        numThreads: 1,
      });
      try {
        validateTensorMetadata(loadedModel);
        if (process.env.NODE_ENV === "development") {
          console.info("iNaturalist tensor metadata", {
            inputs: loadedModel.inputs,
            outputs: loadedModel.outputs,
          });
        }
      } catch (error) {
        releaseTFLiteModel(loadedModel);
        throw error;
      }
      model = loadedModel;
      labels = parsedLabels;
    },
    async predict(image, onProgress) {
      if (!model || !labels) throw new Error("iNaturalist model is not loaded");
      const startedAt = performance.now();
      onProgress?.("preprocessing");
      const data = inputTensorData(image);
      const input = (await loadRuntime()).tensor4d(data, [
        1,
        IMAGE_SIZE,
        IMAGE_SIZE,
        3,
      ]);
      let output: tfjsCore.Tensor | null = null;
      try {
        onProgress?.("running");
        const result = model.predict(input);
        if (!isTFLiteOutput(result)) {
          throw new Error("iNaturalist model returned an unexpected output");
        }
        output = result;
        const values = await result.data();
        if (!(values instanceof Float32Array)) {
          throw new Error(
            "iNaturalist model returned a non-float score tensor",
          );
        }
        return {
          modelId: iNaturalistSmallManifest.id,
          modelRevision: iNaturalistSmallManifest.revision,
          mode: "animal",
          candidates: rankINaturalistScores(values, labels),
          elapsedMs: performance.now() - startedAt,
          scoreInterpretation: "uncalibrated",
          noticeCodes: ["no-exact-rimba-taxon-crosswalk"],
        } satisfies ModelAResult;
      } finally {
        input.dispose();
        output?.dispose();
      }
    },
    async dispose() {
      const loadedModel = model;
      model = null;
      labels = null;
      if (loadedModel) releaseTFLiteModel(loadedModel);
    },
  };
}
