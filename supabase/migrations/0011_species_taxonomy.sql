-- Mirror the complete taxonomy available in the database.
-- Values come from reviewed taxonomic sources; no inferred backfill.
alter table public.species
  add column if not exists domain text,
  add column if not exists kingdom text,
  add column if not exists phylum text,
  add column if not exists subphylum text,
  add column if not exists class text,
  add column if not exists "order" text,
  add column if not exists specific_epithet text generated always as (
    nullif(split_part(btrim(scientific_name), ' ', 2), '')
  ) stored;
