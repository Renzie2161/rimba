export type IdentificationMode = "plant" | "animal";
export type IdentificationSource = "plantnet-resnet18" | "inaturalist-small";

export type ModelAProgress = "preprocessing" | "running";

export interface SupportedRimbaSpecies {
  canonicalTaxonId: string;
  modelSpeciesId: string;
  classIndex: number;
  scientificName: string;
}

export interface ModelManifest {
  id: string;
  revision: string;
  sha256: string;
  byteSize: number;
  license: string;
  sourceUrl: string;
  artifactUrl: string;
  task: "image-classification";
  runtimeVersion: string;
  runtime: "onnxruntime-web" | "tflite" | "tensorflowjs";
  input: {
    name: string;
    width: number;
    height: number;
    colorSpace: "RGB";
    layout: "NCHW" | "NHWC";
    resizeShortSide?: number;
    crop: "center" | "none";
    mean: [number, number, number];
    std: [number, number, number];
  };
  output: {
    name: string;
    classCount: number;
    kind: "logits" | "probabilities";
  };
  labelsPath: string;
  labelSourceUrl: string;
  labelSourceSha256: string;
  supportedRimbaSpecies: SupportedRimbaSpecies[];
}

export interface RimbaSpeciesMedia {
  url: string;
  alt: string;
  positionX: number | null;
  positionY: number | null;
}

export interface RimbaSpeciesPreview {
  id: string;
  slug: string;
  taxonKey: string;
  commonName: string;
  scientificName: string;
  media: RimbaSpeciesMedia | null;
}

export interface ModelCandidate {
  modelClassIndex: number;
  scientificName: string;
  canonicalTaxonId?: string;
  modelScore: number;
  inEncyclopedia: boolean;
  rimbaSpecies?: RimbaSpeciesPreview;
}

export interface ModelAResult {
  modelId: string;
  modelRevision: string;
  mode: IdentificationMode;
  candidates: ModelCandidate[];
  elapsedMs: number;
  scoreInterpretation: "uncalibrated" | "calibrated";
  noticeCodes: string[];
}

export interface ModelAAdapter {
  readonly id: string;
  readonly mode: IdentificationMode;
  isAvailable(): boolean;
  load(): Promise<void>;
  predict(
    image: ImageBitmap,
    onProgress?: (stage: ModelAProgress) => void,
  ): Promise<ModelAResult>;
  dispose(): Promise<void>;
}
