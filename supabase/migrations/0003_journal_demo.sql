create table public.journal_demo_entries (
  id uuid primary key,
  common_name text not null
    check (char_length(btrim(common_name)) between 1 and 100),
  scientific_name text not null
    check (char_length(btrim(scientific_name)) between 1 and 150),
  entry_group text not null check (entry_group in ('flora', 'fauna')),
  observed_at timestamptz not null,
  region_label text not null check (
    char_length(btrim(region_label)) between 1 and 100
    and left(region_label, 7) = 'Demo · '
  ),
  image_path text not null check (
    image_path ~ '^/images/journal-demo/[a-z0-9]+(-[a-z0-9]+)*[.]jpg$'
  ),
  image_alt text not null
    check (char_length(btrim(image_alt)) between 1 and 240),
  needs_review boolean not null default false,
  is_demo boolean not null default true check (is_demo is true)
);

alter table public.journal_demo_entries enable row level security;

revoke all on table public.journal_demo_entries
  from public, anon, authenticated;
grant select on table public.journal_demo_entries to anon, authenticated;

create policy journal_demo_entries_read
  on public.journal_demo_entries
  for select to anon, authenticated
  using (is_demo is true);
