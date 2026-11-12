# Model provenance

**Status: Plant Model A runs locally with verified weights and labels. Publisher golden parity, held-out model-quality evaluation, and mobile/cross-browser acceptance remain open.**

## Plant Model A

- Repository: [cpoisson/plantnet300k-resnet18](https://huggingface.co/cpoisson/plantnet300k-resnet18).

- Pinned revision: `d15cde6e60e07c40369f597467e63bb99a8034b9`.

- ONNX artifact: 46,914,774 bytes; SHA-256 `22b4e24bd1bf7787958528e598ab3c23ab7ce63dae23eb3840a800305361a56c`.

- Local verification confirmed input `image` `[1,3,224,224]`, output `logits` `[1,1081]`, and a successful synthetic inference.

- Label source: `plantnet300K_species_id_2_name.json`; 1,081 entries; source SHA-256 `9c8185db8ebb75958ffa77c8c1b1012b8e3dd493fc64c7cfb33f2049df084d23`.

- Output order follows the publisher inference Space at pinned commit `cbe72e4188b640059f6d836091571b9ba2b78291`, which sorts numeric species IDs before resolving labels. Publisher parity against fixed golden images has not been measured.

- Two explicit crosswalks are verified: `Nepenthes mirabilis (Lour.) Druce` (model ID `1608001`, class `1032`, GBIF `3190712`) and `Nephrolepis exaltata (L.) Schott` (model ID `1356421`, class `27`, GBIF `2650927`; RIMBA name `Nephrolepis exaltata`). No author-suffix normalization or fuzzy matching is used.

- Browser runtime: `onnxruntime-web@1.31.1`; runtime WASM assets are copied from the installed package. Model and labels load only from fixed same-origin allowlisted paths; model bytes are SHA-256 checked before inference.

- The model repository declares Apache-2.0. The [Pl@ntNet-300K dataset](https://zenodo.org/records/5645731) is separately listed as CC-BY-4.0. These licenses are not interchangeable.

## Animal Model A

- Release inspected: [iNaturalist model-files v25.01.15](https://github.com/inaturalist/model-files/releases/tag/v25.01.15), with 507 leaf class IDs.

- Exact-name lookup found no matches for the ten RIMBA fauna targets. Synonyms, checkpoint-specific license, and browser runtime remain unverified.

- Animal and automatic modes remain unavailable; no animal adapter or model assets are shipped.

## Remaining adoption gates

1. Compare browser and publisher outputs on fixed golden images; no parity result exists.

2. Evaluate against a provenance-tracked, held-out RIMBA image set; no accuracy or calibration result exists.

3. A desktop Chrome smoke is recorded in `reports/ai/evaluation.md`; responsive mobile and cross-browser acceptance remain unverified.

4. Resolve exact taxonomy mappings before linking any additional model class to RIMBA.
