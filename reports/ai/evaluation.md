# Identification model evaluation

**Status: technical smoke checks pass; predictive quality is not established.**

## Executed checks

- `bun scripts/ai/verify-model-assets.ts --smoke-image public/images/species/nepenthes-mirabilis.jpg` verified the pinned model hash, 1,081 labels, ONNX tensor metadata, synthetic inference, and one local-image inference.

- The local image smoke ranked `Punica granatum L.` first (score `0.6441`). The file is named `nepenthes-mirabilis.jpg`; this single exploratory result is not a held-out accuracy measurement.

- The smoke used `sharp` preprocessing, not the browser canvas path. It does not establish browser parity with the publisher.

- On this Win32 x64 Bun run, session load was `243.1 ms`, synthetic inference `152.05 ms`, and local-image inference `142.89 ms`. These are one-off development timings, not browser or production performance claims.

## Browser regression checks (2026-11-11)

Verified on `/id/identify` in the isolated Chrome Interceptor test profile:

- A forced HTTP 503 for the label file displayed the model-load error. After clearing the override, **Coba lagi** produced five candidates, linked `Nephrolepis exaltata (L.) Schott` to `/id/species/pakis-pedang`, and left no stale error. Its displayed score was 98%, not a measured accuracy.

- Loading displayed `Memuat model lokal (45 MiB)` instead of the untranslated key.

- The previously rejected `nepenthes-mirabilis.jpg` was reduced from 2,952,241 bytes to a 313,864-byte JPEG at 1535 × 1152, then completed inference. Its top candidate was `Punica granatum L.` (97%); resizing does not establish predictive correctness.

- Synthetic 48 MP portrait and EXIF-rotated fixtures were resized to 1536 × 2048 and 1536 × 1152 respectively. Assertions checked dimensions and orientation. These fixtures test image handling, not species recognition.

- A full-page desktop result capture was inspected. The wrapper's ImageMagick blank-frame check was unavailable; the image was read directly. Mobile-device behavior remains unverified.

- After revalidating the label mapping, the supplied JPEG (38,759 bytes) and WebP (70,866 bytes) both completed inference in isolated Chrome: `Nephrolepis exaltata (L.) Schott` scored 80% and 86%. The label request returned HTTP 200; scores are not accuracy measurements.

- A regression test simulates stale labels without `canonicalTaxonId`; `cache: "no-cache"` passes mapping validation and reaches a deliberate model-404 sentinel. This verifies cache handling, not inference.

- The exact failing origin/profile was unavailable and the error was not reproduced in isolated Chrome. Stale labels are a verified failure mode, not a confirmed cause of the user's browser failure.

Large images are resized locally before preview and inference, with a maximum working edge of 2048 pixels and JPEG quality 0.9. The 8 MiB source-byte limit and 100 MP source-memory safety guard remain: browser decoders can allocate source pixels before downsampling. Corrupt files, MIME mismatches, and oversized decoded output remain rejected. Temporary fixtures and request overrides are removed after the checks.

Regression coverage also checks 48 MP metadata acceptance, source-memory boundaries, and bitmap disposal if a decoder ignores the requested resize bound.

## Not measured

- Golden-image parity against the publisher.

- Held-out accuracy, top-k accuracy, calibration, unknown-species rejection, or memory use.

- Mobile-device performance, cross-browser behavior, and memory use under large-image decoding. The desktop browser checks above do not establish these.

- Model A/B comparison. Model B remains contract-only.

The single local image result shows why candidates remain explicitly uncertain. Model scores are not probabilities; no threshold or final identification claim is made.
