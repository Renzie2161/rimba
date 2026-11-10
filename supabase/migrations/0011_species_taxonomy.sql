-- Mirrors the taxonomy columns already added to the development database.
-- Values are maintained from reviewed taxonomy sources; no inferred backfill.
alter table public.species
  add column if not exists kingdom text,
  add column if not exists "order" text;
