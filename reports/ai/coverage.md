# Model coverage audit

**Plant:** two explicit model-to-RIMBA mappings are enabled. One covers the ten-target Nepenthes draft set; the other maps `Nephrolepis exaltata`. **Fauna:** no supported model mapping; animal mode stays unavailable.

## Plant Model A

The following table audits ten Nepenthes targets in `flora-drafts.json`, using exact label matches only. The separate `Nephrolepis` crosswalk is listed below.

| RIMBA flora target           | Exact model label              | RIMBA mapping  | Local image                      |
| ---------------------------- | ------------------------------ | -------------- | -------------------------------- |
| _Nepenthes aristolochioides_ | No exact match                 | None           | `nepenthes-aristolochioides.jpg` |
| _Nepenthes clipeata_         | No exact match                 | None           | `nepenthes-clipeata.jpg`         |
| _Nepenthes rigidifolia_      | No exact match                 | None           | `nepenthes-rigidifolia.jpg`      |
| _Nepenthes sumatrana_        | No exact match                 | None           | `nepenthes-sumatrana.jpg`        |
| _Nepenthes bicalcarata_      | No exact match                 | None           | `nepenthes-bicalcarata.jpg`      |
| _Nepenthes ampullaria_       | No exact match                 | None           | `nepenthes-ampullaria.jpg`       |
| _Nepenthes rafflesiana_      | No exact match                 | None           | `nepenthes-rafflesiana.jpg`      |
| _Nepenthes mirabilis_        | Class 1032; model ID `1608001` | GBIF `3190712` | `nepenthes-mirabilis.jpg`        |
| _Nepenthes gracilis_         | No exact match                 | None           | `nepenthes-gracilis.jpg`         |
| _Nepenthes boschiana_        | No exact match                 | None           | `nepenthes-boschiana.jpg`        |

The nine absent exact-name matches are not treated as biological exclusions: synonym resolution was not performed. No fuzzy mapping is used in the application.

## Additional exact plant mapping

| RIMBA name             | Model label                        | Model ID  | Class index |  GBIF key |
| ---------------------- | ---------------------------------- | --------- | ----------: | --------: |
| _Nephrolepis exaltata_ | _Nephrolepis exaltata (L.) Schott_ | `1356421` |          27 | `2650927` |

The author citation differs; the link is an explicit stable-taxon crosswalk, not fuzzy name matching.

## Animal Model A

The iNaturalist `v25.01.15` taxonomy has 507 leaf classes and no exact-name hit for these ten fauna targets. Synonyms are unresolved; no animal model class is linked to RIMBA.

| RIMBA fauna target         | Exact model label | Local image asset          |
| -------------------------- | ----------------- | -------------------------- |
| _Varanus komodoensis_      | No exact match    | `komodo.jpg`               |
| _Symphalangus syndactylus_ | No exact match    | `siamang.jpg`              |
| _Pongo pygmaeus_           | No exact match    | `orangutan-kalimantan.jpg` |
| _Pongo abelii_             | No exact match    | `orangutan-sumatra.jpg`    |
| _Bubalus depressicornis_   | No exact match    | `anoa-dataran-rendah.jpg`  |
| _Leucopsar rothschildi_    | No exact match    | `jalak-bali.jpg`           |
| _Macrocephalon maleo_      | No exact match    | `maleo.jpg`                |
| _Rhinoceros sondaicus_     | No exact match    | `badak-jawa.jpg`           |
| _Babyrousa celebensis_     | No exact match    | `babirusa-sulawesi.jpg`    |
| _Dicerorhinus sumatrensis_ | No exact match    | `badak-sumatra.jpg`        |

Local image assets are not a labeled held-out evaluation set. These counts do not describe live database media.

## Sources and limitations

- [iNaturalist model-files release v25.01.15](https://github.com/inaturalist/model-files/releases/tag/v25.01.15).

- [Pl@ntNet ResNet18 model revision](https://huggingface.co/cpoisson/plantnet300k-resnet18/tree/d15cde6e60e07c40369f597467e63bb99a8034b9).

- Local plant targets: `supabase/seeds/flora-drafts.json` and `supabase/seeds/flora-diverse.json`; image assets: `public/images/species/`.

- Coverage establishes label presence and exact mapping only. It does not establish model accuracy, synonym equivalence, or live-database image coverage.
