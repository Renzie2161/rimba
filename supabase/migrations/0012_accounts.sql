-- Google-only private profiles. Execute as the project database owner.
begin;
create table public.account_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  display_name text not null default '' check (char_length(display_name) <= 80),
  location text not null default '' check (char_length(location) <= 120),
  bio text not null default '' check (char_length(bio) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  username_created_at timestamptz,
  username_changed_at timestamptz,
  check ((username is null) = (username_created_at is null)),
  check ((username is null) = (username_changed_at is null))
);
alter table public.account_profiles enable row level security;
revoke all on public.account_profiles from anon, authenticated;
grant select on public.account_profiles to authenticated;
create policy profiles_owner_read on public.account_profiles for select to authenticated
  using (id = (select auth.uid()) and (select auth.jwt()->'app_metadata'->>'provider') = 'google');

-- A trigger protects the timestamp and cooldown even from direct SQL/API writes.
create function public.guard_account_username() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp();
    if new.username is not null then
      new.username_created_at := statement_timestamp();
      new.username_changed_at := statement_timestamp();
    else
      new.username_created_at := null;
      new.username_changed_at := null;
    end if;
  else
    new.id := old.id;
    new.created_at := old.created_at;
    new.username_created_at := old.username_created_at;
    new.username_changed_at := old.username_changed_at;
    if new.username is distinct from old.username then
      if new.username is null then raise exception 'USERNAME_REQUIRED' using errcode = '22023'; end if;
      if old.username_changed_at is not null
        and statement_timestamp() < old.username_changed_at + interval '7 days' then
        raise exception 'USERNAME_LOCKED' using errcode = 'P0001';
      end if;
      new.username_created_at := coalesce(old.username_created_at, statement_timestamp());
      new.username_changed_at := statement_timestamp();
    end if;
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;
create trigger guard_account_username before insert or update on public.account_profiles
  for each row execute function public.guard_account_username();

create function public.ensure_my_account_profile() returns public.account_profiles
language plpgsql security definer set search_path = '' as $$
declare result public.account_profiles;
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'provider', '') <> 'google' then
    raise exception 'GOOGLE_REQUIRED' using errcode = '42501';
  end if;
  insert into public.account_profiles (id, display_name)
    select id, left(coalesce(raw_user_meta_data->>'full_name', ''), 80)
    from auth.users where id = auth.uid()
    on conflict (id) do nothing;
  select * into strict result from public.account_profiles where id = auth.uid();
  return result;
end;
$$;

create function public.save_my_account_profile(p_username text, p_display_name text, p_location text, p_bio text)
returns public.account_profiles language plpgsql security definer set search_path = '' as $$
declare result public.account_profiles;
begin
  perform public.ensure_my_account_profile();
  if p_username is null or p_username !~ '^[a-z][a-z0-9_]{2,23}$'
    or p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 80
    or p_location is null or char_length(p_location) > 120
    or p_bio is null or char_length(p_bio) > 300 then
    raise exception 'INVALID_PROFILE' using errcode = '22023';
  end if;
  -- UPDATE serializes concurrent requests; the trigger checks the locked row.
  update public.account_profiles set username = p_username, display_name = btrim(p_display_name),
    location = btrim(p_location), bio = btrim(p_bio)
    where id = auth.uid() returning * into strict result;
  return result;
end;
$$;
revoke all on function public.guard_account_username() from public;
revoke all on function public.ensure_my_account_profile() from public;
revoke all on function public.save_my_account_profile(text,text,text,text) from public;
grant execute on function public.ensure_my_account_profile() to authenticated;
grant execute on function public.save_my_account_profile(text,text,text,text) to authenticated;
commit;
