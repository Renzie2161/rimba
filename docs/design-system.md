# RIMBA design system: selection and popup controls

## Shared searchable multi-select

Use `MultiSelect` for searchable, multi-value choices. It is controlled by its caller: `selected` supplies current values and `onChange` returns the next value array. Keep data fetching, draft state, validation, and apply behavior in the owning feature.

```tsx
import MultiSelect, {
  type MultiSelectOption,
} from "@/components/ui/multi-select";

const options: MultiSelectOption[] = [
  { value: "flora", label: "Flora" },
  { value: "restricted", label: "Terbatas", disabled: true },
];

<MultiSelect
  label="Kelompok takson"
  placeholder="Semua kelompok"
  searchPlaceholder="Cari opsi"
  emptyLabel="Tidak ada opsi yang cocok"
  options={options}
  selected={selected}
  onChange={setSelected}
/>;
```

`label`, `placeholder`, and `onChange` are required. `searchPlaceholder`, `emptyLabel`, component-level `disabled`, and per-option `disabled` are optional. Pass localized copy from the feature. Search matches option labels. Empty results are announced as a status message.

Keyboard: Enter or Space opens the trigger; Arrow Up/Down on the trigger also opens it. Focus moves to search. Arrow Up/Down moves between enabled options; Home/End moves to the first/last enabled option; Enter/Space toggles selection. Escape closes and restores trigger focus. Pointer interaction outside closes the panel. Focus indicators remain visible.

The component keeps the existing green trigger, selected chips, search row, panel, and option styles. Its short entrance motion is disabled by the global reduced-motion rule.

## Choose the right primitive

| Control                                                                      | Use                                | RIMBA usage                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `MultiSelect`                                                                | Searchable multi-value choice      | Species catalog filters: status, taxon, region, habitat                         |
| Native `<select>`                                                            | Small, single-value choice         | Catalog sort (`name` / `updated`); keep browser keyboard and selection behavior |
| `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover` | Anchored popup panels              | Header notifications and account menu                                           |
| Native `<details>` / `<summary>`                                             | Simple disclosure or language menu | Header language menu; account settings disclosures                              |
| Native `<dialog>`                                                            | Modal content                      | Field guide and mobile navigation; not a selection control                      |

Do not replace a simple native select with a custom listbox. Do not create another feature-local searchable multi-select; extend the shared component only when a real consumer needs the behavior.

## Motion

The app shell wraps route content in a brief view transition. Popovers fade and scale on entry and exit; the language menu and shared multi-select use short entrance motion. The catalog view indicator slides between choices while its filter scrim fades and drawer slides in or out. Motion preserves control dimensions and data behavior; the global reduced-motion rule suppresses it.

## Social previews

Public pages use `socialMetadata` from `src/lib/social-metadata.ts` for matching document, Open Graph, and Twitter titles, descriptions, canonical URLs, and `summary_large_image` cards. Pass the localized title and route path; species pages also pass their sourced SEO description. Keep login's existing no-index policy.

The layout resolves absolute URLs against `NEXT_PUBLIC_SITE_URL`, falling back to `https://rimbakita.my.id`. Static 1200 × 630 PNGs in `public/images/social/` reuse the Rimba mark and existing forest hero: deep green ground, cream text, sage headline accent, and generous safe margins. No image generation runs per request. Indonesian is the enabled site locale; the English artwork is prepared but does not enable an English route.

When updating artwork, preserve the original logo and photo, check legibility at thumbnail size, and keep filenames synchronized with the metadata helper. No Twitter account handle is claimed without a verified brand account.
