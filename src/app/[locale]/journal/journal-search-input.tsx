"use client";

import { useEffect, useState } from "react";

type JournalSearchInputProps = {
  label: string;
  placeholder: string;
  query: string;
};

export default function JournalSearchInput({
  label,
  placeholder,
  query,
}: JournalSearchInputProps) {
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    const restoreFromUrl = () => {
      setDraft(new URLSearchParams(window.location.search).get("q") ?? "");
    };

    window.addEventListener("pageshow", restoreFromUrl);
    window.addEventListener("popstate", restoreFromUrl);
    return () => {
      window.removeEventListener("pageshow", restoreFromUrl);
      window.removeEventListener("popstate", restoreFromUrl);
    };
  }, []);

  return (
    <input
      aria-label={label}
      autoComplete="off"
      maxLength={200}
      name="q"
      onChange={(event) => setDraft(event.currentTarget.value)}
      placeholder={placeholder}
      type="search"
      value={draft}
    />
  );
}
