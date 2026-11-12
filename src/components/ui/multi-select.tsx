"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import styles from "./multi-select.module.css";

export type MultiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  label: string;
  placeholder: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
};

export default function MultiSelect({
  label,
  placeholder,
  options,
  selected,
  onChange,
  searchPlaceholder,
  emptyLabel = "Tidak ada opsi",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const listId = useId();
  const labelId = useId();
  const valueId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
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

  const enabled = visible.filter((option) => !option.disabled);
  const activeOption =
    enabled.find((option) => option.value === activeValue) ?? enabled[0];
  const selectedOptions = options.filter((option) =>
    selected.includes(option.value),
  );
  const selectedLabels = selectedOptions.map((option) => option.label);

  function focusOption(index: number) {
    const option = enabled[index];
    if (!option) return;
    setActiveValue(option.value);
    optionRefs.current.get(option.value)?.focus();
  }

  function moveFocus(currentValue: string, direction: -1 | 1) {
    if (enabled.length === 0) return;
    const index = enabled.findIndex((option) => option.value === currentValue);
    const next =
      index < 0
        ? direction === 1
          ? 0
          : enabled.length - 1
        : (index + direction + enabled.length) % enabled.length;
    focusOption(next);
  }

  function toggle(value: string) {
    if (disabled || options.find((option) => option.value === value)?.disabled)
      return;
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
    setActiveValue(value);
  }

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(enabled.length - 1);
    } else if (event.key === "Enter" && activeOption) {
      event.preventDefault();
      toggle(activeOption.value);
    }
  }

  function onOptionKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    option: MultiSelectOption,
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(option.value, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(option.value, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusOption(enabled.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(option.value);
    }
  }

  return (
    <div className={styles.field} ref={wrapperRef}>
      <span className={styles.label} id={labelId}>
        {label}
      </span>
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={`${labelId} ${valueId}`}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className={styles.value} id={valueId}>
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

      {selectedOptions.length > 0 ? (
        <div className={styles.chips}>
          {selectedOptions.map((option) => (
            <span className={styles.chip} key={option.value}>
              {option.label}
              <button
                aria-label={`Hapus ${option.label}`}
                className={styles.chipRemove}
                disabled={disabled}
                onClick={() =>
                  onChange(selected.filter((value) => value !== option.value))
                }
                type="button"
              >
                <X aria-hidden="true" size={12} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className={styles.panel}>
          <div className={styles.searchRow}>
            <Search aria-hidden="true" size={15} strokeWidth={2} />
            <input
              aria-controls={listId}
              aria-label={searchPlaceholder ?? label}
              className={styles.search}
              onChange={(event) => {
                setTerm(event.target.value);
                setActiveValue(null);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder ?? "Cari…"}
              ref={searchRef}
              type="search"
              value={term}
            />
          </div>
          <ul
            aria-labelledby={labelId}
            aria-multiselectable="true"
            className={styles.list}
            id={listId}
            role="listbox"
          >
            {visible.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <li key={option.value} role="presentation">
                  <button
                    aria-disabled={option.disabled || undefined}
                    aria-selected={isSelected}
                    className={
                      isSelected
                        ? `${styles.option} ${styles.optionSelected}`
                        : styles.option
                    }
                    disabled={option.disabled}
                    onClick={() => toggle(option.value)}
                    onKeyDown={(event) => onOptionKeyDown(event, option)}
                    ref={(node) => {
                      if (node) optionRefs.current.set(option.value, node);
                      else optionRefs.current.delete(option.value);
                    }}
                    role="option"
                    tabIndex={activeOption?.value === option.value ? 0 : -1}
                    type="button"
                  >
                    <span className={styles.check} aria-hidden="true">
                      {isSelected ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
          {visible.length === 0 ? (
            <p aria-live="polite" className={styles.empty} role="status">
              {emptyLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
