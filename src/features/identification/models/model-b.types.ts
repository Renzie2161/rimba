export interface EmbeddingMatch {
  speciesId: string;
  scientificName: string;
  referenceImageId: string;
  similarity: number;
}

export interface ModelBResult {
  modelId: string;
  modelRevision: string;
  indexVersion: string;
  matches: EmbeddingMatch[];
  evaluationStatus: "not_validated" | "validated";
}

export interface ModelBAdapter {
  isAvailable(): boolean;
  match(image: ImageBitmap): Promise<ModelBResult>;
}
