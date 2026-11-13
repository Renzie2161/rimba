"use client";

import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import styles from "./multi-select.module.css";

type Option<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};

type Props<Value extends string> = {
  label: string;
  value: Value;
  options: readonly Option<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
  emptyLabel?: string;
};

export default function SingleSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  emptyLabel = "Tidak ada opsi",
}: Props<Value>) {
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<Value | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef(new Map<Value, HTMLButtonElement>());
  const listId = useId();
  const labelId = useId();
  const valueId = useId();
  const enabled = useMemo(
    () => options.filter((option) => !option.disabled),
    [options],
  );
  const selectedOption = options.find((option) => option.value === value);
  const activeOption =
    enabled.find((option) => option.value === activeValue) ??
    enabled.find((option) => option.value === value) ??
    enabled[0];

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
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function focusOption(index: number) {
    const option = enabled[index];
    if (!option) return;
    setActiveValue(option.value);
    optionRefs.current.get(option.value)?.focus();
  }

  function moveFocus(currentValue: string, direction: -1 | 1) {
    if (enabled.length === 0) return;
    const index = enabled.findIndex((option) => option.value === currentValue);
    focusOption(
      index < 0
        ? direction === 1
          ? 0
          : enabled.length - 1
        : (index + direction + enabled.length) % enabled.length,
    );
  }

  function choose(option: Option<Value>) {
    if (disabled || option.disabled) return;
    onChange(option.value);
    setActiveValue(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onOptionKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    option: Option<Value>,
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
      choose(option);
    }
  }

  return (
    <div
      className={styles.field}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !wrapperRef.current?.contains(event.relatedTarget)
        ) {
          setOpen(false);
        }
      }}
      ref={wrapperRef}
    >
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
        onClick={() => {
          setActiveValue(value);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActiveValue(value);
            setOpen(true);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className={styles.value} id={valueId}>
          {selectedOption?.label ?? emptyLabel}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={open ? styles.chevronOpen : styles.chevron}
          size={16}
          strokeWidth={2}
        />
      </button>
      {open ? (
        <div className={styles.panel}>
          <ul
            aria-labelledby={labelId}
            className={styles.list}
            id={listId}
            role="listbox"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              const isActive = activeOption?.value === option.value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    aria-disabled={option.disabled || undefined}
                    aria-selected={isSelected}
                    autoFocus={isActive}
                    className={
                      isSelected
                        ? `${styles.option} ${styles.optionSelected}`
                        : styles.option
                    }
                    disabled={option.disabled}
                    onClick={() => choose(option)}
                    onKeyDown={(event) => onOptionKeyDown(event, option)}
                    ref={(node) => {
                      if (node) optionRefs.current.set(option.value, node);
                      else optionRefs.current.delete(option.value);
                    }}
                    role="option"
                    tabIndex={isActive ? 0 : -1}
                    type="button"
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
          {options.length === 0 ? (
            <p aria-live="polite" className={styles.empty} role="status">
              {emptyLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
