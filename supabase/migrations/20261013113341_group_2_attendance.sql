begin;
create schema if not exists private;

create table public.attendance_members (
  participant_number integer primary key check (participant_number > 0),
  full_name text not null check (length(full_name) between 1 and 200),
  group_number integer not null check (group_number = 2),
  element_number integer not null check (element_number between 1 and 3),
  unique (participant_number, group_number, element_number)
);
create table public.attendance_profiles (
  user_id uuid primary key references auth.users(id),
  unit text not null unique,
  role text not null check (role in ('dangroup','danelemen')),
  group_number integer not null check (group_number = 2),
  element_number integer,
  display_name text not null,
  participant_number integer not null references public.attendance_members(participant_number),
  check ((role = 'dangroup' and element_number is null and unit = 'group-2') or
    (role = 'danelemen' and element_number is not null and element_number between 1 and 3 and unit = 'group-2-element-' || element_number::text))
);
create table public.attendance_groups (
  group_number integer primary key check (group_number = 2),
  commander_name text not null
);
create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  group_number integer not null default 2 check (group_number = 2),
  date date not null,
  kind text not null check (kind in ('pagi','malam','insidental')),
  label text not null default '',
  time time not null,
  check ((kind in ('pagi','malam') and label = '') or (kind = 'insidental' and length(label) between 1 and 120)),
  unique (group_number, date, kind, label),
  unique (id, group_number)
);
create table public.attendance_records (
  session_id uuid not null,
  participant_number integer not null,
  group_number integer not null check (group_number = 2),
  element_number integer not null check (element_number between 1 and 3),
  status text not null check (status in ('Belum dicatat','Hadir','Sakit','Izin','Dinas Luar','Tidak Hadir')),
  reason text not null default '' check (length(reason) <= 1000),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  revision integer not null default 1 check (revision > 0),
  primary key (session_id, participant_number),
  foreign key (session_id, group_number) references public.attendance_sessions(id, group_number),
  foreign key (participant_number, group_number, element_number) references public.attendance_members(participant_number, group_number, element_number),
  check (status in ('Belum dicatat','Hadir') or length(btrim(reason)) > 0)
);
create index attendance_records_member_idx on public.attendance_records (participant_number, group_number, element_number);
create index attendance_records_author_idx on public.attendance_records (recorded_by);
create index attendance_profiles_member_idx on public.attendance_profiles (participant_number);
create index attendance_members_scope_idx on public.attendance_members (group_number, element_number);

alter table public.attendance_profiles enable row level security;
alter table public.attendance_members enable row level security;
alter table public.attendance_groups enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

create policy profiles_self on public.attendance_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy members_scope on public.attendance_members for select to authenticated using (
  exists (select 1 from public.attendance_profiles p where p.user_id = (select auth.uid())
    and p.group_number = attendance_members.group_number and (p.element_number is null or p.element_number = attendance_members.element_number))
);
create policy groups_scope on public.attendance_groups for select to authenticated using (
  group_number in (select p.group_number from public.attendance_profiles p where p.user_id = (select auth.uid()))
);
create policy sessions_read on public.attendance_sessions for select to authenticated using (
  group_number in (select p.group_number from public.attendance_profiles p where p.user_id = (select auth.uid()))
);
create policy sessions_create on public.attendance_sessions for insert to authenticated with check (
  group_number in (select p.group_number from public.attendance_profiles p where p.user_id = (select auth.uid()) and p.role = 'danelemen')
);
create policy records_read on public.attendance_records for select to authenticated using (
  exists (select 1 from public.attendance_profiles p where p.user_id = (select auth.uid())
    and p.group_number = attendance_records.group_number and (p.element_number is null or p.element_number = attendance_records.element_number))
);
create policy records_create on public.attendance_records for insert to authenticated with check (
  recorded_by = (select auth.uid()) and exists (select 1 from public.attendance_profiles p where p.user_id = (select auth.uid()) and p.role = 'danelemen'
    and p.group_number = attendance_records.group_number and p.element_number = attendance_records.element_number)
);
create policy records_update on public.attendance_records for update to authenticated using (
  exists (select 1 from public.attendance_profiles p where p.user_id = (select auth.uid()) and p.role = 'danelemen'
    and p.group_number = attendance_records.group_number and p.element_number = attendance_records.element_number)
) with check (
  recorded_by = (select auth.uid()) and exists (select 1 from public.attendance_profiles p where p.user_id = (select auth.uid()) and p.role = 'danelemen'
    and p.group_number = attendance_records.group_number and p.element_number = attendance_records.element_number)
);
revoke all on public.attendance_profiles, public.attendance_members, public.attendance_groups, public.attendance_sessions, public.attendance_records from anon, authenticated;
grant select on public.attendance_profiles, public.attendance_members, public.attendance_groups, public.attendance_sessions, public.attendance_records to authenticated;
grant insert on public.attendance_sessions to authenticated;
grant insert, update on public.attendance_records to authenticated;
grant all on public.attendance_profiles, public.attendance_members, public.attendance_groups, public.attendance_sessions, public.attendance_records to service_role;

create function private.stamp_attendance() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  new.recorded_by := auth.uid();
  new.recorded_at := clock_timestamp();
  new.revision := case when tg_op = 'UPDATE' then old.revision + 1 else 1 end;
  return new;
end;
$$;
revoke all on function private.stamp_attendance() from public, anon, authenticated;
create trigger stamp_attendance before insert or update on public.attendance_records for each row execute function private.stamp_attendance();

create function public.attendance_commander() returns text language sql stable security invoker set search_path = '' as $$
  select commander_name from public.attendance_groups where group_number = 2;
$$;
revoke all on function public.attendance_commander() from public, anon;
grant execute on function public.attendance_commander() to authenticated;

create function public.save_element_attendance(p_date date, p_kind text, p_label text, p_time time, p_entries jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_profile public.attendance_profiles%rowtype;
  v_session uuid;
  v_label text;
  v_count integer;
begin
  select * into v_profile from public.attendance_profiles where user_id = auth.uid();
  if v_profile.user_id is null or v_profile.role <> 'danelemen' then raise exception 'Only DanElemen may record attendance'; end if;
  if p_date is null or p_time is null or p_kind is null or p_kind not in ('pagi','malam','insidental') then raise exception 'Invalid session'; end if;
  v_label := case when p_kind = 'insidental' then lower(btrim(p_label)) else '' end;
  if v_label is null or (p_kind = 'insidental' and length(v_label) not between 1 and 120) then raise exception 'Incident name is required'; end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then raise exception 'Invalid entries'; end if;
  select count(*) into v_count from public.attendance_members where group_number = v_profile.group_number and element_number = v_profile.element_number;
  if v_count <> 30 or jsonb_array_length(p_entries) <> v_count then raise exception 'Complete element roster required'; end if;
  if (select count(distinct e.participant_number) from jsonb_to_recordset(p_entries) as e(participant_number integer)) <> v_count
    or exists (select 1 from jsonb_to_recordset(p_entries) as e(participant_number integer, revision integer)
      where e.revision is null or e.revision < 0 or e.participant_number is null or not exists (
        select 1 from public.attendance_members m where m.participant_number = e.participant_number and m.group_number = v_profile.group_number and m.element_number = v_profile.element_number))
  then raise exception 'Roster outside element scope or duplicate member'; end if;
  -- Serialize a shared group session, including simultaneous first saves.
  perform pg_advisory_xact_lock(hashtextextended('g2:' || p_date::text || ':' || p_kind || ':' || v_label, 0));
  select id into v_session from public.attendance_sessions where group_number = 2 and date = p_date and kind = p_kind and label = v_label;
  if v_session is null then
    insert into public.attendance_sessions (date, kind, label, time) values (p_date, p_kind, v_label, p_time) returning id into v_session;
  end if;
  if exists (select 1 from jsonb_to_recordset(p_entries) as e(participant_number integer, revision integer)
    left join public.attendance_records r on r.session_id = v_session and r.participant_number = e.participant_number
    where e.revision <> coalesce(r.revision, 0)) then raise exception 'Data changed. Reload before saving'; end if;
  insert into public.attendance_records (session_id, participant_number, group_number, element_number, status, reason, recorded_by)
    select v_session, e.participant_number, 2, v_profile.element_number, e.status,
      case when e.status in ('Hadir','Belum dicatat') then '' else btrim(e.reason) end, auth.uid()
    from jsonb_to_recordset(p_entries) as e(participant_number integer, status text, reason text, revision integer)
    on conflict (session_id, participant_number) do update set status = excluded.status, reason = excluded.reason;
  return v_session;
end;
$$;
revoke all on function public.save_element_attendance(date,text,text,time,jsonb) from public, anon;
grant execute on function public.save_element_attendance(date,text,text,time,jsonb) to authenticated;

create table private.pin_attempts (fingerprint text primary key, started_at timestamptz not null, attempts integer not null);
alter table private.pin_attempts enable row level security;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.pin_attempts to service_role;
create function public.consume_pin_attempt(p_fingerprint text) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_attempts integer;
begin
  delete from private.pin_attempts where started_at < now() - interval '1 day';
  insert into private.pin_attempts values (p_fingerprint, now(), 1)
    on conflict (fingerprint) do update set
      attempts = case when private.pin_attempts.started_at < now() - interval '10 minutes' then 1 else private.pin_attempts.attempts + 1 end,
      started_at = case when private.pin_attempts.started_at < now() - interval '10 minutes' then now() else private.pin_attempts.started_at end
    returning attempts into v_attempts;
  return v_attempts <= 20;
end;
$$;
revoke all on function public.consume_pin_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_pin_attempt(text) to service_role;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.attendance_records, public.attendance_sessions;
  end if;
end $$;
commit;
