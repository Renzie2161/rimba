-- Phase 1 biodiversity backbone (files only; do not apply without approval).
-- Covers species, translations, aliases, assessments, sources, media,
-- campaigns, and admin roles with published-only public reads.

create extension if not exists "pgcrypto";


create table public.sources (
  id uuid primary key default gen_random_uuid(),
  organization text,
  title text not null,
  url text not null,
  published_on date,
  accessed_on date not null,
  license text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.species (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  scientific_name text not null,
  taxon_group text not null,
  family text,
  genus text,
  gbif_taxon_key text,
  iucn_taxon_id text,
  region_codes text[] not null default '{}',
  habitat_codes text[] not null default '{}',
  featured_rank int,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.species_translations (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species (id) on delete cascade,
  locale text not null check (locale in ('id', 'en')),
  common_name text,
  summary text,
  description text,
  distinctive_traits text,
  habitat_description text,
  threats_description text,
  conservation_actions text,
  seo_title text,
  seo_description text,
  translation_status text not null default 'draft'
    check (translation_status in ('draft', 'reviewed', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (species_id, locale)
);

create table public.species_aliases (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species (id) on delete cascade,
  locale text not null check (locale in ('id', 'en')),
  name text not null,
  kind text,
  created_at timestamptz not null default now()
);

create table public.conservation_assessments (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species (id) on delete cascade,
  status_code text not null
    check (status_code in ('EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE')),
  assessment_year int,
  source_id uuid references public.sources (id) on delete set null,
  population_estimate_min bigint,
  population_estimate_max bigint,
  population_unit text,
  population_trend text check (population_trend in ('increasing', 'decreasing', 'stable', 'unknown')),
  notes text,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index conservation_assessments_one_current_per_species
  on public.conservation_assessments (species_id)
  where is_current;

create table public.species_sources (
  species_id uuid not null references public.species (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  section_key text not null default '',
  created_at timestamptz not null default now(),
  primary key (species_id, source_id, section_key)
);

create table public.species_media (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species (id) on delete cascade,
  url text not null,
  storage_path text,
  alt_id text,
  alt_en text,
  photographer text,
  source_url text,
  license_code text,
  license_url text,
  attribution_text text,
  position_x numeric,
  position_y numeric,
  sort_order int not null default 0,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  species_id uuid references public.species (id) on delete set null,
  partner_name text,
  partner_url text,
  is_partner_verified boolean not null default false,
  goal_amount_demo bigint,
  currency text not null default 'IDR',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_translations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  locale text not null check (locale in ('id', 'en')),
  title text,
  summary text,
  body text,
  translation_status text not null default 'draft'
    check (translation_status in ('draft', 'reviewed', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, locale)
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('curator', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);
-- Staff role helpers bypass profiles RLS via security definer.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('curator', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Indexes for catalog reads.
create index species_status_featured_idx on public.species (status, featured_rank);
create index species_translations_lookup_idx
  on public.species_translations (species_id, locale);
create index conservation_assessments_lookup_idx
  on public.conservation_assessments (species_id, is_current);
create index campaigns_status_idx on public.campaigns (status);
create index species_media_species_sort_idx
  on public.species_media (species_id, sort_order);

alter table public.species enable row level security;
alter table public.species_translations enable row level security;
alter table public.species_aliases enable row level security;
alter table public.conservation_assessments enable row level security;
alter table public.sources enable row level security;
alter table public.species_sources enable row level security;
alter table public.species_media enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_translations enable row level security;
alter table public.profiles enable row level security;

-- Helpers use a fixed search path and never trust browser role metadata.
revoke all on function public.is_staff(), public.is_admin() from public;
grant execute on function public.is_staff(), public.is_admin() to anon, authenticated;

create function public.can_edit_species(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (
    public.is_staff() and exists (
      select 1 from public.species where id = target and status = 'draft'
    )
  );
$$;

create function public.is_published_species(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.species where id = target and status = 'published');
$$;

create function public.source_is_public(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.species_sources ss join public.species s on s.id = ss.species_id
    where ss.source_id = target and s.status = 'published'
  ) or exists (
    select 1 from public.conservation_assessments ca join public.species s on s.id = ca.species_id
    where ca.source_id = target and s.status = 'published'
  );
$$;

revoke all on function public.can_edit_species(uuid),
  public.is_published_species(uuid), public.source_is_public(uuid) from public;
grant execute on function public.can_edit_species(uuid),
  public.is_published_species(uuid), public.source_is_public(uuid) to anon, authenticated;

create policy species_read on public.species for select to anon, authenticated
  using (status = 'published' or public.is_staff());
create policy species_insert on public.species for insert to authenticated
  with check (public.is_admin() or (public.is_staff() and status = 'draft'));
create policy species_update on public.species for update to authenticated
  using (public.is_admin() or (public.is_staff() and status = 'draft'))
  with check (public.is_admin() or (public.is_staff() and status = 'draft'));
create policy species_delete on public.species for delete to authenticated using (public.is_admin());

create policy translation_read on public.species_translations for select to anon, authenticated
  using (public.is_staff() or (
    translation_status = 'published' and public.is_published_species(species_id)
  ));
create policy translation_insert on public.species_translations for insert to authenticated
  with check (public.is_admin() or (
    public.can_edit_species(species_id) and translation_status <> 'published'
  ));
create policy translation_update on public.species_translations for update to authenticated
  using (public.is_admin() or (
    public.can_edit_species(species_id) and translation_status <> 'published'
  ))
  with check (public.is_admin() or (
    public.can_edit_species(species_id) and translation_status <> 'published'
  ));
create policy translation_delete on public.species_translations for delete to authenticated using (public.is_admin());

-- Identical supporting-row permissions check both old and proposed parents.
do $$
declare table_name text;
begin
  foreach table_name in array array['species_aliases', 'conservation_assessments', 'species_sources'] loop
    execute format('create policy supporting_read on public.%I for select to anon, authenticated using (public.is_staff() or public.is_published_species(species_id))', table_name);
    execute format('create policy supporting_insert on public.%I for insert to authenticated with check (public.can_edit_species(species_id))', table_name);
    execute format('create policy supporting_update on public.%I for update to authenticated using (public.can_edit_species(species_id)) with check (public.can_edit_species(species_id))', table_name);
    execute format('create policy supporting_delete on public.%I for delete to authenticated using (public.is_admin())', table_name);
  end loop;
end;
$$;

create policy sources_read on public.sources for select to anon, authenticated
  using (public.is_staff() or public.source_is_public(id));
create policy sources_insert on public.sources for insert to authenticated with check (public.is_staff());
create policy sources_update on public.sources for update to authenticated
  using (public.is_admin() or (public.is_staff() and not public.source_is_public(id)))
  with check (public.is_admin() or (public.is_staff() and not public.source_is_public(id)));
create policy sources_delete on public.sources for delete to authenticated using (public.is_admin());

create policy media_read on public.species_media for select to anon, authenticated
  using (public.is_staff() or (approved and public.is_published_species(species_id)));
create policy media_insert on public.species_media for insert to authenticated
  with check (public.is_admin() or (not approved and public.can_edit_species(species_id)));
create policy media_update on public.species_media for update to authenticated
  using (public.is_admin() or (not approved and public.can_edit_species(species_id)))
  with check (public.is_admin() or (not approved and public.can_edit_species(species_id)));
create policy media_delete on public.species_media for delete to authenticated using (public.is_admin());

create policy campaign_read on public.campaigns for select to anon, authenticated
  using (status = 'published' or public.is_staff());
create policy campaign_admin on public.campaigns for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy campaign_translation_read on public.campaign_translations for select to anon, authenticated
  using (public.is_staff() or (translation_status = 'published' and exists (
    select 1 from public.campaigns c where c.id = campaign_id and c.status = 'published'
  )));
create policy campaign_translation_admin on public.campaign_translations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy profiles_read on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy profiles_admin on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.species, public.species_translations, public.species_aliases,
  public.conservation_assessments, public.sources, public.species_sources,
  public.species_media, public.campaigns, public.campaign_translations to anon;
grant select, insert, update, delete on public.species, public.species_translations,
  public.species_aliases, public.conservation_assessments, public.sources,
  public.species_sources, public.species_media, public.campaigns,
  public.campaign_translations, public.profiles to authenticated;

alter table public.species add column taxon_rank text not null default 'species'
  check (taxon_rank in ('species', 'subspecies'));
alter table public.conservation_assessments
  add column assessment_scope text not null default 'global' check (btrim(assessment_scope) <> ''),
  add column assessed_on date,
  alter column source_id set not null;
alter table public.conservation_assessments
  drop constraint conservation_assessments_source_id_fkey,
  add foreign key (source_id) references public.sources(id) on delete restrict,
  add check (assessment_year is null or assessment_year between 1500 and 2100),
  add check (population_estimate_min is null or population_estimate_min >= 0),
  add check (population_estimate_max is null or population_estimate_max >= 0),
  add check (population_estimate_max is null or population_estimate_min is null or population_estimate_max >= population_estimate_min),
  add check (assessment_year is null or assessed_on is null or extract(year from assessed_on) = assessment_year),
  add check ((population_estimate_min is null and population_estimate_max is null) or (
    nullif(btrim(population_unit), '') is not null and nullif(btrim(notes), '') is not null
  ));
alter table public.sources
  alter column organization set not null,
  add check (nullif(btrim(organization), '') is not null),
  add check (nullif(btrim(title), '') is not null),
  add check (url ~ '^https?://[^/[:space:]]+');
alter table public.species_media add check (
  not approved or (
    url ~ '^https?://[^/[:space:]]+' and source_url ~ '^https?://[^/[:space:]]+'
    and nullif(btrim(alt_id), '') is not null
    and nullif(btrim(photographer), '') is not null
    and nullif(btrim(license_code), '') is not null
    and nullif(btrim(attribution_text), '') is not null
    and source_url is not null
  )
);
alter table public.species_media add check (license_url is null or license_url ~ '^https?://[^/[:space:]]+');
alter table public.species_media add check (position_x is null or position_x between 0 and 100);
alter table public.species_media add check (position_y is null or position_y between 0 and 100);

-- Deferred checks permit atomic edits but reject incomplete publication at commit.
create function public.check_species_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid; old_target uuid;
begin
  if tg_table_name = 'species' then
    target := coalesce(new.id, old.id);
  else
    target := coalesce(new.species_id, old.species_id);
    if tg_op = 'UPDATE' then old_target := old.species_id; end if;
  end if;
  for target in select distinct x from unnest(array[target, old_target]) x where x is not null loop
    if exists (select 1 from public.species where id = target and status = 'published') then
      if not exists (
        select 1 from public.species_translations t where t.species_id = target
        and t.locale = 'id' and t.translation_status = 'published'
        and nullif(btrim(t.common_name), '') is not null
        and nullif(btrim(t.summary), '') is not null
        and nullif(btrim(t.description), '') is not null
        and nullif(btrim(t.distinctive_traits), '') is not null
        and nullif(btrim(t.habitat_description), '') is not null
        and nullif(btrim(t.threats_description), '') is not null
        and nullif(btrim(t.conservation_actions), '') is not null
      ) then raise exception 'Publication requires complete published Indonesian content' using errcode = '23514'; end if;
      if not exists (select 1 from public.species_sources where species_id = target) then
        raise exception 'Publication requires a source citation' using errcode = '23514';
      end if;
    end if;
  end loop;
  return null;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['species', 'species_translations', 'species_sources'] loop
    execute format('create constraint trigger publication_integrity after insert or update or delete on public.%I deferrable initially deferred for each row execute function public.check_species_publication()', table_name);
  end loop;
end;
$$;

create function public.check_campaign_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid; old_target uuid;
begin
  if tg_table_name = 'campaigns' then target := coalesce(new.id, old.id);
  else
    target := coalesce(new.campaign_id, old.campaign_id);
    if tg_op = 'UPDATE' then old_target := old.campaign_id; end if;
  end if;
  for target in select distinct x from unnest(array[target, old_target]) x where x is not null loop
    if exists (select 1 from public.campaigns where id = target and status = 'published')
      and not exists (select 1 from public.campaign_translations where campaign_id = target
        and locale = 'id' and translation_status = 'published'
        and nullif(btrim(title), '') is not null and nullif(btrim(summary), '') is not null
        and nullif(btrim(body), '') is not null) then
      raise exception 'Campaign publication requires complete Indonesian content' using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;
create constraint trigger campaign_integrity after insert or update on public.campaigns
  deferrable initially deferred for each row execute function public.check_campaign_publication();
create constraint trigger campaign_translation_integrity after insert or update or delete on public.campaign_translations
  deferrable initially deferred for each row execute function public.check_campaign_publication();

-- Serialize child edits with publication so concurrent curator writes cannot race it.
create function public.lock_species_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid; old_target uuid; parent_status text;
  source_target uuid; old_source uuid; new_source uuid;
begin
  -- Link creation and source edits must serialize on the same source row.
  if tg_table_name in ('species_sources', 'conservation_assessments') then
    if tg_op <> 'DELETE' then new_source := new.source_id; end if;
    if tg_op <> 'INSERT' then old_source := old.source_id; end if;
    for source_target in select distinct x from unnest(array[new_source, old_source]) x where x is not null order by x loop
      perform 1 from public.sources where id = source_target for share;
    end loop;
  end if;
  target := coalesce(new.species_id, old.species_id);
  if tg_op = 'UPDATE' then old_target := old.species_id; end if;
  for target in select distinct x from unnest(array[target, old_target]) x where x is not null order by x loop
    select status into parent_status from public.species where id = target for update;
    if auth.uid() is not null and not public.is_admin() and parent_status <> 'draft' then
      raise exception 'Only admins may modify published supporting content' using errcode = '42501';
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
do $$
declare table_name text;
begin
  foreach table_name in array array['species_translations', 'species_aliases', 'conservation_assessments', 'species_sources', 'species_media'] loop
    execute format('create trigger lock_species_parent before insert or update or delete on public.%I for each row execute function public.lock_species_parent()', table_name);
  end loop;
end;
$$;

create function public.lock_source_parents() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  for target in
    select species_id from public.species_sources where source_id = old.id
    union select species_id from public.conservation_assessments where source_id = old.id
    order by species_id
  loop
    perform 1 from public.species where id = target for update;
  end loop;
  if auth.uid() is not null and not public.is_admin() and public.source_is_public(old.id) then
    raise exception 'Only admins may modify published shared sources' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger lock_source_parents before update or delete on public.sources
  for each row execute function public.lock_source_parents();

create function public.lock_campaign_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid; old_target uuid;
begin
  target := coalesce(new.campaign_id, old.campaign_id);
  if tg_op = 'UPDATE' then old_target := old.campaign_id; end if;
  for target in select distinct x from unnest(array[target, old_target]) x where x is not null order by x loop
    perform 1 from public.campaigns where id = target for update;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger lock_campaign_parent before insert or update or delete on public.campaign_translations
  for each row execute function public.lock_campaign_parent();

-- Counts travel through JSON numbers; reject values that cannot remain exact.
alter table public.conservation_assessments
  add check (population_estimate_min is null or population_estimate_min <= 9007199254740991),
  add check (population_estimate_max is null or population_estimate_max <= 9007199254740991);
