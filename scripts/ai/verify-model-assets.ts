import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import * as ort from "onnxruntime-web/wasm";
import sharp from "sharp";
import {
  rankPlantNetLogits,
  rgbaToNchw,
  type PlantNetLabel,
} from "../../src/features/identification/models/plantnet-resnet18";
import { plantNetManifest } from "../../src/features/identification/models/plantnet-resnet18.manifest";
const root = process.cwd();
const modelPath = join(root, "public", plantNetManifest.artifactUrl.slice(1));
const labelsPath = join(root, "public", plantNetManifest.labelsPath.slice(1));
const sourcePath = join(root, "public/ai/labels/plantnet-resnet18-source.json");
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function roundHalfToEven(value: number) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction === 0.5) return lower % 2 === 0 ? lower : lower + 1;
  return Math.round(value);
}

async function runImageSmoke(
  imagePath: string,
  session: ort.InferenceSession,
  labels: readonly PlantNetLabel[],
) {
  const metadata = await sharp(imagePath).metadata();
  assert(
    typeof metadata.width === "number" &&
      typeof metadata.height === "number" &&
      metadata.width > 0 &&
      metadata.height > 0,
    "Smoke image dimensions are unavailable",
  );
  const resizeShortSide = plantNetManifest.input.resizeShortSide;
  assert(
    typeof resizeShortSide === "number" && resizeShortSide > 0,
    "Model resize dimension is unavailable",
  );
  const shortSide = Math.min(metadata.width, metadata.height);
  const resizedLongSide = Math.floor(
    (Math.max(metadata.width, metadata.height) * resizeShortSide) / shortSide,
  );
  const resizedWidth =
    metadata.width < metadata.height ? resizeShortSide : resizedLongSide;
  const resizedHeight =
    metadata.height < metadata.width ? resizeShortSide : resizedLongSide;
  const width = plantNetManifest.input.width;
  const height = plantNetManifest.input.height;
  const { data, info } = await sharp(imagePath)
    .resize(resizedWidth, resizedHeight, { fit: "fill", kernel: "lanczos3" })
    .extract({
      left: roundHalfToEven((resizedWidth - width) / 2),
      top: roundHalfToEven((resizedHeight - height) / 2),
      width,
      height,
    })
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert(
    info.width === width && info.height === height && info.channels === 4,
    "Smoke image preprocessing returned unexpected dimensions",
  );

  const tensor = rgbaToNchw(data, width, height);
  const startedAt = performance.now();
  const output = await session.run({
    [plantNetManifest.input.name]: new ort.Tensor("float32", tensor, [
      1,
      3,
      height,
      width,
    ]),
  });
  const logits = output[plantNetManifest.output.name];
  assert(
    logits?.type === "float32" &&
      logits.data instanceof Float32Array &&
      logits.data.length === plantNetManifest.output.classCount,
    "Smoke image produced an unexpected output tensor",
  );
  return {
    candidates: rankPlantNetLogits(logits.data, labels).map(
      ({ modelClassIndex, scientificName, modelScore }) => ({
        modelClassIndex,
        scientificName,
        modelScore,
      }),
    ),
    inferenceMs: Number((performance.now() - startedAt).toFixed(2)),
    preprocessing: "sharp-lanczos3; not browser parity",
  };
}

async function main() {
  const sourceBytes = await readFile(sourcePath);
  assert(
    sha256(sourceBytes) === plantNetManifest.labelSourceSha256,
    "Pinned label source checksum mismatch",
  );
  const source = JSON.parse(sourceBytes.toString("utf8")) as Record<
    string,
    unknown
  >;
  const sourceIds = Object.keys(source);
  assert(
    sourceIds.length === plantNetManifest.output.classCount,
    "Label source class count mismatch",
  );
  assert(
    sourceIds.every(
      (id) => /^\d+$/.test(id) && Number.isSafeInteger(Number(id)),
    ),
    "Label source contains an invalid species id",
  );
  sourceIds.sort((left, right) => Number(left) - Number(right));

  const byClassIndex = new Map(
    plantNetManifest.supportedRimbaSpecies.map((species) => [
      species.classIndex,
      species,
    ]),
  );
  const labels = sourceIds.map((plantnetSpeciesId, classIndex) => {
    const scientificName = source[plantnetSpeciesId];
    assert(
      typeof scientificName === "string" && scientificName.trim().length > 0,
      `Missing scientific name for model class ${plantnetSpeciesId}`,
    );
    const supported = byClassIndex.get(classIndex);
    if (supported) {
      assert(
        supported.modelSpeciesId === plantnetSpeciesId &&
          supported.scientificName === scientificName,
        "RIMBA crosswalk does not match the pinned label source",
      );
      return {
        classIndex,
        plantnetSpeciesId,
        scientificName,
        canonicalTaxonId: supported.canonicalTaxonId,
      } satisfies PlantNetLabel;
    }
    return {
      classIndex,
      plantnetSpeciesId,
      scientificName,
    } satisfies PlantNetLabel;
  });
  assert(
    byClassIndex.size === plantNetManifest.supportedRimbaSpecies.length,
    "Duplicate supported RIMBA class indices",
  );

  const generatedLabels = `${JSON.stringify(labels, null, 2)}\n`;
  if (process.argv.includes("--write-labels")) {
    await writeFile(labelsPath, generatedLabels);
  } else {
    const checkedInLabels = await readFile(labelsPath, "utf8");
    assert(checkedInLabels === generatedLabels, "Ordered label map is stale");
  }

  const modelBytes = await readFile(modelPath);
  assert(
    modelBytes.byteLength === plantNetManifest.byteSize,
    "Model byte size mismatch",
  );
  assert(
    sha256(modelBytes) === plantNetManifest.sha256,
    "Model SHA-256 mismatch",
  );

  const runtimePackage = JSON.parse(
    await readFile(
      join(root, "node_modules/onnxruntime-web/package.json"),
      "utf8",
    ),
  ) as { version: string };
  assert(
    runtimePackage.version === plantNetManifest.runtimeVersion,
    "onnxruntime-web version mismatch",
  );
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = `${join(root, "node_modules/onnxruntime-web/dist")}${sep}`;

  const startedAt = performance.now();
  const session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: ["wasm"],
  });
  const loadMs = performance.now() - startedAt;
  try {
    assert(
      session.inputNames.length === 1 &&
        session.inputNames[0] === plantNetManifest.input.name,
      "ONNX input name mismatch",
    );
    assert(
      session.outputNames.length === 1 &&
        session.outputNames[0] === plantNetManifest.output.name,
      "ONNX output name mismatch",
    );

    const input = new ort.Tensor(
      "float32",
      new Float32Array(
        3 * plantNetManifest.input.width * plantNetManifest.input.height,
      ),
      [1, 3, plantNetManifest.input.height, plantNetManifest.input.width],
    );
    const inferenceStartedAt = performance.now();
    const output = await session.run({ [plantNetManifest.input.name]: input });
    const inferenceMs = performance.now() - inferenceStartedAt;
    const logits = output[plantNetManifest.output.name];
    assert(
      logits?.type === "float32" && logits.data instanceof Float32Array,
      "ONNX output is not float32 logits",
    );
    assert(
      logits.data.length === plantNetManifest.output.classCount &&
        logits.dims.length === 2 &&
        logits.dims[0] === 1 &&
        logits.dims[1] === plantNetManifest.output.classCount,
      "ONNX output dimensions mismatch",
    );
    assert(
      logits.data.every(Number.isFinite),
      "Synthetic input produced non-finite logits",
    );

    let sampleImageSmoke:
      (Awaited<ReturnType<typeof runImageSmoke>> & { image: string }) | null =
      null;
    const smokeImageIndex = process.argv.indexOf("--smoke-image");
    if (smokeImageIndex !== -1) {
      const imageArgument = process.argv[smokeImageIndex + 1];
      assert(imageArgument, "--smoke-image requires an image path");
      const imagePath = resolve(root, imageArgument);
      sampleImageSmoke = {
        ...(await runImageSmoke(imagePath, session, labels)),
        image: relative(root, imagePath),
      };
    }

    console.log(
      JSON.stringify(
        {
          modelRevision: plantNetManifest.revision,
          modelBytes: modelBytes.byteLength,
          modelSha256: sha256(modelBytes),
          labelCount: labels.length,
          labelSourceSha256: sha256(sourceBytes),
          input: { name: session.inputNames[0], dimensions: [1, 3, 224, 224] },
          output: {
            name: session.outputNames[0],
            dimensions: logits.dims,
            kind: plantNetManifest.output.kind,
          },
          localSessionLoadMs: Number(loadMs.toFixed(2)),
          syntheticInferenceMs: Number(inferenceMs.toFixed(2)),
          sampleImageSmoke,
          parityAgainstPublisher: "not measured",
        },
        null,
        2,
      ),
    );
  } finally {
    await session.release();
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
