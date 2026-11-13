"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  resolveRimbaCandidates,
  resolveTaxonResponseSchema,
} from "@/features/identification/domain/taxon-resolution";
import type {
  IdentificationMode,
  ModelAAdapter,
  ModelCandidate,
} from "@/features/identification/domain/types";
import {
  imageFromClipboard,
  prepareImageFile,
  type ImageValidationError,
} from "@/features/identification/image-validation";
import { createINaturalistSmallAdapter } from "@/features/identification/models/inaturalist-small";
import { createPlantNetResNet18Adapter } from "@/features/identification/models/plantnet-resnet18";

import IdentificationResults, {
  type IdentificationResultsLabels,
} from "@/features/identification/presentation/identification-results";

import styles from "./identify.module.css";

type Activity =
  | "idle"
  | "validating"
  | "loading-model"
  | "preprocessing"
  | "running"
  | "resolving"
  | "results"
  | "error";

// Camera capture needs a device camera; `capture` silently degrades to a file
// picker without one. This is read as an external snapshot so the server render
// and the hydrating client render agree before the real value is known.
const subscribe = () => () => undefined;
function getCameraSnapshot() {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.mediaDevices?.getUserMedia !== "function") return false;
  // An iPad with a trackpad reports a fine pointer, so the pointer query alone
  // would misclassify it as desktop. Touch capability is the durable signal:
  // any touch device with a coarse pointer counts, and so does any multi-touch
  // surface (an iPad reports five points even with a keyboard attached).
  const touchPoints = navigator.maxTouchPoints;
  if (touchPoints === 0) return false;
  return touchPoints > 1 || window.matchMedia("(pointer: coarse)").matches;
}
const getCameraServerSnapshot = () => false;

type Labels = {
  modeLabel: string;
  modePlant: string;
  modeAnimal: string;
  modeAuto: string;
  modePlantInfo: string;
  modeAnimalInfo: string;
  modeAutoUnavailable: string;
  dropTitlePlant: string;
  dropTitleAnimal: string;
  modelCreditPlant: string;
  modelCreditAnimal: string;
  dropHelp: string;
  dropActive: string;
  pastedImage: string;
  chooseFile: string;
  takePhoto: string;
  fileTypeError: string;
  fileSizeError: string;
  fileTooLarge: string;
  fileInvalidError: string;
  fileDimensionsError: string;
  fileDecoderError: string;
  analysing: string;
  loadingPlantModel: string;
  loadingAnimalModel: string;
  preprocessing: string;
  runningInference: string;
  resolving: string;
  runtimeUnavailable: string;
  offlineError: string;
  modelTimeout: string;
  modelLoadError: string;
  imageDecodeError: string;
  inferenceError: string;
  retry: string;
  previewAlt: string;
  removeImage: string;
} & IdentificationResultsLabels;

type Props = { labels: Labels };

/**
 * Runs the selected model locally; only verified GBIF keys reach encyclopedia lookup.
 */
export default function IdentifyWorkspace({ labels }: Props) {
  const [selectedMode, setSelectedMode] = useState<IdentificationMode>("plant");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity>("idle");
  const [candidates, setCandidates] = useState<ModelCandidate[]>([]);
  const [lookupWarning, setLookupWarning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chooseButtonRef = useRef<HTMLButtonElement>(null);
  const dragDepth = useRef(0);
  const validationAttempt = useRef(0);
  const activeFile = useRef<File | null>(null);
  const adapterRef = useRef<ModelAAdapter | null>(null);

  const cameraAvailable = useSyncExternalStore(
    subscribe,
    getCameraSnapshot,
    getCameraServerSnapshot,
  );
  const busy =
    activity === "validating" ||
    activity === "loading-model" ||
    activity === "preprocessing" ||
    activity === "running" ||
    activity === "resolving";
  const dropTitle =
    selectedMode === "plant" ? labels.dropTitlePlant : labels.dropTitleAnimal;
  const status =
    activity === "validating"
      ? labels.analysing
      : activity === "loading-model"
        ? selectedMode === "plant"
          ? labels.loadingPlantModel
          : labels.loadingAnimalModel
        : activity === "preprocessing"
          ? labels.preprocessing
          : activity === "running"
            ? labels.runningInference
            : activity === "resolving"
              ? labels.resolving
              : null;

  useEffect(() => {
    return () => {
      validationAttempt.current += 1;
      const adapter = adapterRef.current;
      adapterRef.current = null;
      if (adapter) void adapter.dispose().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (busy) return;
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest('input:not([type="file"]), textarea'))
      ) {
        return;
      }
      const file = imageFromClipboard(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      void accept(file, labels.pastedImage);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  });

  async function identify(
    file: File,
    attempt: number,
    mode: IdentificationMode,
  ) {
    setError(null);
    setLookupWarning(false);
    const previousAdapter = adapterRef.current;
    if (previousAdapter && previousAdapter.mode !== mode) {
      adapterRef.current = null;
      void previousAdapter.dispose().catch(() => undefined);
    }
    const adapter =
      adapterRef.current ??
      (mode === "plant"
        ? createPlantNetResNet18Adapter()
        : createINaturalistSmallAdapter());
    adapterRef.current = adapter;
    if (!adapter.isAvailable()) {
      setError(labels.runtimeUnavailable);
      setActivity("error");
      return;
    }

    setActivity("loading-model");
    try {
      await adapter.load();
    } catch (cause) {
      if (attempt !== validationAttempt.current) return;
      setError(
        navigator.onLine === false
          ? labels.offlineError
          : cause instanceof Error && cause.name === "AbortError"
            ? labels.modelTimeout
            : labels.modelLoadError,
      );
      setActivity("error");
      return;
    }
    if (attempt !== validationAttempt.current) return;

    let image: ImageBitmap;
    try {
      image = await createImageBitmap(file);
    } catch {
      if (attempt !== validationAttempt.current) return;
      setError(labels.imageDecodeError);
      setActivity("error");
      return;
    }
    if (attempt !== validationAttempt.current) {
      image.close();
      return;
    }

    let prediction: Awaited<ReturnType<typeof adapter.predict>>;
    try {
      prediction = await adapter.predict(image, (stage) => {
        if (attempt === validationAttempt.current) setActivity(stage);
      });
    } catch {
      if (attempt === validationAttempt.current) {
        setError(labels.inferenceError);
        setActivity("error");
      }
      return;
    } finally {
      image.close();
    }
    if (attempt !== validationAttempt.current) return;

    const taxonKeys = Array.from(
      new Set(
        prediction.candidates.flatMap(({ canonicalTaxonId }) =>
          canonicalTaxonId ? [canonicalTaxonId] : [],
        ),
      ),
    ).slice(0, 5);
    let resolved = resolveRimbaCandidates(prediction.candidates, []);

    if (taxonKeys.length > 0) {
      setActivity("resolving");
      try {
        const response = await fetch("/api/identify/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taxonKeys }),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Taxon lookup failed");
        const lookup = resolveTaxonResponseSchema.parse(await response.json());
        resolved = resolveRimbaCandidates(
          prediction.candidates,
          lookup.species,
        );
      } catch {
        if (attempt !== validationAttempt.current) return;
        setLookupWarning(true);
      }
    }
    if (attempt !== validationAttempt.current) return;
    setCandidates(resolved);
    setActivity("results");
  }

  async function accept(file: File, displayName = file.name) {
    const attempt = ++validationAttempt.current;
    activeFile.current = null;
    setPreviewUrl(null);
    setFileName("");
    setCandidates([]);
    setLookupWarning(false);
    setError(null);
    setActivity("validating");

    const validation = await prepareImageFile(file).catch(
      () => ({ ok: false, error: "invalid-image" }) as const,
    );
    if (attempt !== validationAttempt.current) return;

    if (!validation.ok) {
      const messages: Record<ImageValidationError, string> = {
        empty: labels.fileSizeError,
        "too-large": labels.fileTooLarge,
        "unsupported-type": labels.fileTypeError,
        "type-mismatch": labels.fileInvalidError,
        "invalid-image": labels.fileInvalidError,
        "dimensions-too-large": labels.fileDimensionsError,
        "decoder-unavailable": labels.fileDecoderError,
      };
      setError(messages[validation.error]);
      setActivity("error");
      return;
    }

    activeFile.current = validation.file;
    setFileName(displayName);
    setPreviewUrl(URL.createObjectURL(validation.file));
    void identify(validation.file, attempt, selectedMode);
  }

  function selectMode(mode: IdentificationMode) {
    if (busy || mode === selectedMode) return;
    setSelectedMode(mode);
    setCandidates([]);
    setLookupWarning(false);
    setError(null);
    if (activeFile.current) {
      const attempt = ++validationAttempt.current;
      setActivity("validating");
      void identify(activeFile.current, attempt, mode);
    } else {
      setActivity("idle");
    }
  }

  function clear() {
    activeFile.current = null;
    setPreviewUrl(null);
    setFileName("");
    setCandidates([]);
    setLookupWarning(false);
    setError(null);
    setActivity("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    validationAttempt.current += 1;
    requestAnimationFrame(() => chooseButtonRef.current?.focus());
  }

  return (
    <>
      <fieldset className={styles.modeSelector}>
        <legend>{labels.modeLabel}</legend>
        <div className={styles.modeOptions}>
          <button
            aria-pressed={selectedMode === "plant"}
            className={
              selectedMode === "plant" ? styles.modeActive : styles.modeOption
            }
            disabled={busy}
            onClick={() => selectMode("plant")}
            type="button"
          >
            {labels.modePlant}
          </button>
          <button
            aria-pressed={selectedMode === "animal"}
            className={
              selectedMode === "animal" ? styles.modeActive : styles.modeOption
            }
            disabled={busy}
            onClick={() => selectMode("animal")}
            type="button"
          >
            {labels.modeAnimal}
          </button>
          <button
            aria-describedby="identify-mode-help"
            className={styles.modeOption}
            disabled
            type="button"
          >
            {labels.modeAuto}
          </button>
        </div>
        <p className={styles.modeHelp} id="identify-mode-help">
          {selectedMode === "plant"
            ? labels.modePlantInfo
            : labels.modeAnimalInfo}{" "}
          {labels.modeAutoUnavailable}
        </p>
      </fieldset>

      <section
        aria-busy={busy}
        aria-labelledby="identify-upload"
        className={styles.uploader}
      >
        <h2 className="sr-only" id="identify-upload">
          {dropTitle}
        </h2>

        {previewUrl ? (
          <div className={styles.preview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={labels.previewAlt}
              className={styles.previewImage}
              src={previewUrl}
            />
            <button
              aria-label={labels.removeImage}
              className={styles.remove}
              onClick={clear}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </button>
            <p className={styles.fileName}>{fileName}</p>
          </div>
        ) : (
          <div
            aria-labelledby="identify-upload"
            className={`${styles.dropzone}${dragging ? ` ${styles.dropzoneActive}` : ""}`}
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("button")
              ) {
                return;
              }
              if (!busy) fileInputRef.current?.click();
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              dragDepth.current += 1;
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              dragDepth.current -= 1;
              if (dragDepth.current <= 0) setDragging(false);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              dragDepth.current = 0;
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (!busy && file) void accept(file);
            }}
            role="region"
          >
            <ImagePlus
              aria-hidden="true"
              className={styles.dropIcon}
              size={34}
              strokeWidth={1.6}
            />
            <p className={styles.dropTitle}>
              {dragging ? labels.dropActive : dropTitle}
            </p>
            <p className={styles.dropHelp}>{labels.dropHelp}</p>
            <div
              className={`${styles.actions}${cameraAvailable ? "" : ` ${styles.actionsSingle}`}`}
            >
              <button
                className={cameraAvailable ? styles.secondary : styles.primary}
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                ref={chooseButtonRef}
                type="button"
              >
                <ImagePlus aria-hidden="true" size={17} strokeWidth={2} />
                {labels.chooseFile}
              </button>
              {cameraAvailable ? (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => cameraInputRef.current?.click()}
                  type="button"
                >
                  <Camera aria-hidden="true" size={17} strokeWidth={1.9} />
                  {labels.takePhoto}
                </button>
              ) : null}
            </div>
          </div>
        )}

        <input
          accept="image/jpeg,image/png,image/webp"
          aria-hidden="true"
          className={styles.fileInput}
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (file) void accept(file).finally(() => (input.value = ""));
          }}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-hidden="true"
          capture="environment"
          className={styles.fileInput}
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (file) void accept(file).finally(() => (input.value = ""));
          }}
          ref={cameraInputRef}
          tabIndex={-1}
          type="file"
        />

        {status ? (
          <p className={styles.validationStatus} role="status">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {previewUrl && activity === "error" ? (
        <div className={styles.errorPanel}>
          <button
            className={styles.secondary}
            onClick={() => {
              if (activeFile.current) {
                void identify(
                  activeFile.current,
                  validationAttempt.current,
                  selectedMode,
                );
              }
            }}
            type="button"
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      {previewUrl && activity === "results" ? (
        <IdentificationResults
          candidates={candidates}
          fileName={fileName}
          labels={labels}
          lookupWarning={lookupWarning}
          modelAttribution={
            selectedMode === "plant"
              ? labels.modelCreditPlant
              : labels.modelCreditAnimal
          }
          onRescan={() => {
            if (activeFile.current) {
              void identify(
                activeFile.current,
                validationAttempt.current,
                selectedMode,
              );
            }
          }}
          previewUrl={previewUrl}
        />
      ) : null}
    </>
  );
}
