"use client";

import { useEffect, useRef } from "react";
import { recordSpeciesActivity } from "./actions";

export default function SpeciesActivityRecorder({
  speciesId,
}: {
  speciesId: string;
}) {
  const recordedSpeciesId = useRef<string | null>(null);

  useEffect(() => {
    if (recordedSpeciesId.current === speciesId) return;
    recordedSpeciesId.current = speciesId;
    void recordSpeciesActivity(speciesId, "viewed").catch(() => {
      console.error("Failed to save species activity.");
    });
  }, [speciesId]);

  return null;
}
