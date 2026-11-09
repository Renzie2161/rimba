"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./multiselect.module.css";

export type Option = { value: string; label: string };

type Props = {
  label: string;
  placeholder: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  emptyLabel?: string;
};

/**
 * Searchable multiselect built from plain elements so it inherits the site
 * theme instead of a library's defaults. Closed by default, keyboard-operable,
 * and the panel closes on outside click or Escape.
 */
export default function Multiselect({
  label,
  placeholder,
  options,
  selected,
  onChange,
  searchPlaceholder,
  emptyLabel = "Tidak ada opsi",
}: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visible = useMemo(() => {
    const needle = term.trim().toLocaleLowerCase("id");
    if (!needle) return options;
    return options.filter((option) =>
      option.label.toLocaleLowerCase("id").includes(needle),
    );
  }, [options, term]);

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <div className={styles.field} ref={wrapperRef}>
      <span className={styles.label}>{label}</span>
      <button
        aria-controls={listId}
        aria-expanded={open}
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={styles.value}>
          {selectedLabels.length === 0
            ? placeholder
            : selectedLabels.length <= 2
              ? selectedLabels.join(", ")
              : `${selectedLabels[0]} +${selectedLabels.length - 1}`}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={open ? styles.chevronOpen : styles.chevron}
          size={16}
          strokeWidth={2}
        />
      </button>

      {selected.length > 0 ? (
        <div className={styles.chips}>
          {selectedLabels.map((item) => (
            <span className={styles.chip} key={item}>
              {item}
              <button
                aria-label={`Hapus ${item}`}
                className={styles.chipRemove}
                onClick={() => {
                  const option = options.find((entry) => entry.label === item);
                  if (option) toggle(option.value);
                }}
                type="button"
              >
                <X aria-hidden="true" size={12} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className={styles.panel} id={listId}>
          <div className={styles.searchRow}>
            <Search aria-hidden="true" size={15} strokeWidth={2} />
            <input
              aria-label={searchPlaceholder ?? label}
              className={styles.search}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={searchPlaceholder ?? "Cari…"}
              ref={searchRef}
              type="search"
              value={term}
            />
          </div>
          <ul
            className={styles.list}
            role="listbox"
            aria-multiselectable="true"
          >
            {visible.length === 0 ? (
              <li className={styles.empty}>{emptyLabel}</li>
            ) : (
              visible.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <li key={option.value}>
                    <button
                      aria-selected={isSelected}
                      className={
                        isSelected
                          ? `${styles.option} ${styles.optionSelected}`
                          : styles.option
                      }
                      onClick={() => toggle(option.value)}
                      role="option"
                      type="button"
                    >
                      <span className={styles.check} aria-hidden="true">
                        {isSelected ? (
                          <Check size={13} strokeWidth={3} />
                        ) : null}
                      </span>
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
