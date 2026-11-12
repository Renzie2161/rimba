import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { iNaturalistSmallManifest } from "../../src/features/identification/models/inaturalist-small.manifest";
import { plantNetManifest } from "../../src/features/identification/models/plantnet-resnet18.manifest";

const root = process.cwd();
const packagePath = join(root, "node_modules/onnxruntime-web/package.json");
let packageInfo: { version: string };
try {
  const parsed: unknown = JSON.parse(await readFile(packagePath, "utf8"));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    typeof parsed.version !== "string"
  ) {
    throw new Error("Invalid package metadata");
  }
  packageInfo = { version: parsed.version };
} catch {
  throw new Error("Cannot read valid onnxruntime-web package metadata");
}
if (packageInfo.version !== plantNetManifest.runtimeVersion) {
  throw new Error("onnxruntime-web version does not match the model manifest");
}

const sourceDirectory = join(root, "node_modules/onnxruntime-web/dist");
const destinationDirectory = join(
  root,
  "public/ai/runtime/onnxruntime-web",
  packageInfo.version,
);
await mkdir(destinationDirectory, { recursive: true });
for (const file of [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
]) {
  await copyFile(join(sourceDirectory, file), join(destinationDirectory, file));
}
const tflitePackagePath = join(
  root,
  "node_modules/@tensorflow/tfjs-tflite/package.json",
);
let tflitePackage: unknown;
try {
  tflitePackage = JSON.parse(await readFile(tflitePackagePath, "utf8"));
} catch {
  throw new Error("Cannot read valid tfjs-tflite package metadata");
}
if (
  typeof tflitePackage !== "object" ||
  tflitePackage === null ||
  !("version" in tflitePackage) ||
  tflitePackage.version !== iNaturalistSmallManifest.runtimeVersion
) {
  throw new Error(
    "tfjs-tflite version does not match the iNaturalist manifest",
  );
}

const tfliteSourceDirectory = join(
  root,
  "node_modules/@tensorflow/tfjs-tflite/wasm",
);
const tfliteDestinationDirectory = join(
  root,
  "public/ai/runtime/tfjs-tflite",
  iNaturalistSmallManifest.runtimeVersion,
);
await mkdir(tfliteDestinationDirectory, { recursive: true });
for (const file of [
  "tflite_web_api_client.js",
  "tflite_web_api_cc.js",
  "tflite_web_api_cc.wasm",
  "tflite_web_api_cc_threaded.js",
  "tflite_web_api_cc_threaded.wasm",
  "tflite_web_api_cc_threaded.worker.js",
  "tflite_web_api_cc_simd.js",
  "tflite_web_api_cc_simd.wasm",
  "tflite_web_api_cc_simd_threaded.js",
  "tflite_web_api_cc_simd_threaded.wasm",
  "tflite_web_api_cc_simd_threaded.worker.js",
]) {
  await copyFile(
    join(tfliteSourceDirectory, file),
    join(tfliteDestinationDirectory, file),
  );
}
