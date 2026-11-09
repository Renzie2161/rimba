"use client";

import { Camera, ImagePlus, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./identify.module.css";

const MAX_BYTES = 8 * 1024 * 1024;

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
  dropTitle: string;
  dropHelp: string;
  dropActive: string;
  chooseFile: string;
  takePhoto: string;
  fileTypeError: string;
  fileSizeError: string;
  fileTooLarge: string;
  analysing: string;
  unavailableTitle: string;
  unavailableBody: string;
  trySearch: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchSubmit: string;
  previewAlt: string;
  removeImage: string;
};

type Props = { labels: Labels; searchHref: "/species" };

/**
 * Upload/capture surface.
 *
 * No classifier is wired up: the result stage states that plainly and offers the
 * catalog name search instead. Nothing here simulates inference or confidence.
 */
export default function IdentifyWorkspace({ labels, searchHref }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // `capture` only produces a camera UI on devices that have one. Reading it as an
  // external snapshot keeps server and first client render identical, so the
  // control is decided on mount without a state write inside an effect.
  const cameraAvailable = useSyncExternalStore(
    subscribe,
    getCameraSnapshot,
    getCameraServerSnapshot,
  );

  // Object URLs leak until revoked; release on replace and unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function accept(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(labels.fileTypeError);
      return;
    }
    if (file.size === 0) {
      setError(labels.fileSizeError);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(labels.fileTooLarge);
      return;
    }
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clear() {
    setPreviewUrl(null);
    setFileName("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  return (
    <>
      <section aria-labelledby="identify-upload" className={styles.uploader}>
        <h2 className="sr-only" id="identify-upload">
          {labels.dropTitle}
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
            className={`${styles.dropzone}${dragging ? ` ${styles.dropzoneActive}` : ""}`}
            onClick={() => fileInputRef.current?.click()}
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
              if (file) accept(file);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <ImagePlus
              aria-hidden="true"
              className={styles.dropIcon}
              size={34}
              strokeWidth={1.6}
            />
            <p className={styles.dropTitle}>
              {dragging ? labels.dropActive : labels.dropTitle}
            </p>
            <p className={styles.dropHelp}>{labels.dropHelp}</p>
            <div
              className={`${styles.actions}${cameraAvailable ? "" : ` ${styles.actionsSingle}`}`}
            >
              <button
                className={cameraAvailable ? styles.secondary : styles.primary}
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
                type="button"
              >
                <ImagePlus aria-hidden="true" size={17} strokeWidth={2} />
                {labels.chooseFile}
              </button>
              {cameraAvailable ? (
                <button
                  className={styles.primary}
                  onClick={(event) => {
                    event.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  type="button"
                >
                  <Camera aria-hidden="true" size={17} strokeWidth={1.9} />
                  {labels.takePhoto}
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Kept out of the layout without relying on a utility class. */}
        <input
          accept="image/*"
          aria-hidden="true"
          className={styles.fileInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) accept(file);
          }}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />
        {/* capture opens the device camera on supporting mobile browsers. */}
        <input
          accept="image/*"
          aria-hidden="true"
          capture="environment"
          className={styles.fileInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) accept(file);
          }}
          ref={cameraInputRef}
          tabIndex={-1}
          type="file"
        />

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {previewUrl ? (
        <section
          aria-labelledby="identify-result"
          className={styles.result}
          role="status"
        >
          <h2 id="identify-result">{labels.unavailableTitle}</h2>
          <p>{labels.unavailableBody}</p>
          <form action={searchHref} className={styles.fallback} method="get">
            <label className={styles.searchLabel} htmlFor="identify-query">
              {labels.searchLabel}
            </label>
            <div className={styles.searchRow}>
              <input
                id="identify-query"
                name="q"
                placeholder={labels.searchPlaceholder}
                type="search"
              />
              <button className={styles.primary} type="submit">
                <Search aria-hidden="true" size={17} strokeWidth={2} />
                {labels.searchSubmit}
              </button>
            </div>
            <p className={styles.trySearch}>{labels.trySearch}</p>
          </form>
        </section>
      ) : null}
    </>
  );
}
