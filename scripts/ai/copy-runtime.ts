import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
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
