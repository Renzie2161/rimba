import type { ModelManifest } from "../domain/types";

export const iNaturalistSmallManifest = {
  id: "inaturalist-small",
  revision: "v25.01.15",
  sha256: "eae277b24efa629b998d5f9c091da0576162cb1aad498786087acd001dc86d2c",
  byteSize: 22_197_168,
  license:
    "MIT (iNaturalist model-files repository; no separate asset license)",
  sourceUrl:
    "https://github.com/inaturalist/model-files/releases/tag/v25.01.15",
  artifactUrl: "/ai/models/inaturalist-small/v25.01.15/model.tflite",
  task: "image-classification",
  runtime: "tflite",
  runtimeVersion: "0.0.1-alpha.10",
  input: {
    name: "image",
    width: 299,
    height: 299,
    colorSpace: "RGB",
    layout: "NHWC",
    crop: "center",
    mean: [0, 0, 0],
    std: [1, 1, 1],
  },
  output: {
    name: "vision_scores",
    classCount: 507,
    kind: "probabilities",
  },
  labelsPath: "/ai/labels/inaturalist-small/v25.01.15/taxonomy.csv",
  labelSourceUrl:
    "https://github.com/inaturalist/model-files/releases/download/v25.01.15/taxonomy.csv",
  labelSourceSha256:
    "bd18483667d8a0ce7c1676ad4160a61589390ef090b0fb8092da50832dcecb69",
  supportedRimbaSpecies: [],
} satisfies ModelManifest;
