begin;

create table public.account_species_activity (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  species_id uuid not null references public.species (id) on delete cascade,
  activity_type text not null check (activity_type in ('identified', 'viewed')),
  occurred_at timestamptz not null default statement_timestamp()
);

create index account_species_activity_recent_idx
  on public.account_species_activity (account_id, occurred_at desc, id desc);

alter table public.account_species_activity enable row level security;
revoke all on table public.account_species_activity from public, anon, authenticated;

create function public.record_my_species_activity(
  p_species_id uuid,
  p_activity_type text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'google' then
    return;
  end if;

  if p_species_id is null
    or p_activity_type is null
    or p_activity_type not in ('identified', 'viewed') then
    raise exception 'INVALID_ACTIVITY_TYPE' using errcode = '22023';
  end if;

  if not public.is_published_species(p_species_id) then
    return;
  end if;

  insert into public.account_species_activity (account_id, species_id, activity_type)
  values (account_id, p_species_id, p_activity_type);
end;
$$;

create function public.get_my_species_activity()
returns table (
  id uuid,
  activity_type text,
  occurred_at timestamptz,
  species_slug text,
  species_common_name text,
  species_scientific_name text
)
language sql stable security definer set search_path = '' as $$
  select
    activity.id,
    activity.activity_type,
    activity.occurred_at,
    species.slug,
    coalesce(nullif(translation.common_name, ''), species.scientific_name),
    species.scientific_name
  from public.account_species_activity as activity
  join public.species as species
    on species.id = activity.species_id and species.status = 'published'
  left join public.species_translations as translation
    on translation.species_id = species.id
    and translation.locale = 'id'
    and translation.translation_status = 'published'
  where activity.account_id = auth.uid()
    and auth.jwt() -> 'app_metadata' ->> 'provider' = 'google'
  order by activity.occurred_at desc, activity.id desc
  limit 20;
$$;

revoke all on function public.record_my_species_activity(uuid, text) from public, anon;
revoke all on function public.get_my_species_activity() from public, anon;
grant execute on function public.record_my_species_activity(uuid, text) to authenticated;
grant execute on function public.get_my_species_activity() to authenticated;

commit;
