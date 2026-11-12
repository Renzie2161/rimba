import type { ModelManifest } from "../domain/types";

export const plantNetManifest = {
  id: "plantnet300k-resnet18",
  revision: "d15cde6e60e07c40369f597467e63bb99a8034b9",
  sha256: "22b4e24bd1bf7787958528e598ab3c23ab7ce63dae23eb3840a800305361a56c",
  byteSize: 46_914_774,
  license: "Apache-2.0",
  sourceUrl:
    "https://huggingface.co/cpoisson/plantnet300k-resnet18/tree/d15cde6e60e07c40369f597467e63bb99a8034b9",
  artifactUrl:
    "/ai/models/plantnet-resnet18/d15cde6e60e07c40369f597467e63bb99a8034b9/model.onnx",
  task: "image-classification",
  runtime: "onnxruntime-web",
  runtimeVersion: "1.31.1",
  input: {
    name: "image",
    width: 224,
    height: 224,
    colorSpace: "RGB",
    layout: "NCHW",
    resizeShortSide: 256,
    crop: "center",
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
  },
  output: {
    name: "logits",
    classCount: 1081,
    kind: "logits",
  },
  labelsPath: "/ai/labels/plantnet-resnet18.json",
  labelSourceUrl:
    "https://huggingface.co/cpoisson/plantnet300k-resnet18/resolve/d15cde6e60e07c40369f597467e63bb99a8034b9/plantnet300K_species_id_2_name.json",
  labelSourceSha256:
    "9c8185db8ebb75958ffa77c8c1b1012b8e3dd493fc64c7cfb33f2049df084d23",
  supportedRimbaSpecies: [
    {
      canonicalTaxonId: "3190712",
      modelSpeciesId: "1608001",
      classIndex: 1032,
      scientificName: "Nepenthes mirabilis (Lour.) Druce",
    },
    {
      canonicalTaxonId: "2650927",
      modelSpeciesId: "1356421",
      classIndex: 27,
      scientificName: "Nephrolepis exaltata (L.) Schott",
    },
  ],
} satisfies ModelManifest;
