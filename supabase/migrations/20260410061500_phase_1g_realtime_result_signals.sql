create table public.question_result_signals (
  question_id uuid primary key references public.questions(id) on delete cascade,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

grant select (question_id, version, updated_at)
on public.question_result_signals to anon, authenticated;

alter table public.question_result_signals enable row level security;

create policy question_result_signals_read
on public.question_result_signals
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.questions q
    join public.sessions s on s.id = q.session_id
    where q.id = question_result_signals.question_id
      and (s.state = 'live' or s.host_id = auth.uid())
  )
);

create or replace function public.touch_question_result_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_question_id uuid := coalesce(new.question_id, old.question_id);
begin
  insert into public.question_result_signals (question_id, version, updated_at)
  values (target_question_id, 1, clock_timestamp())
  on conflict (question_id) do update
    set version = public.question_result_signals.version + 1,
        updated_at = clock_timestamp();

  return null;
end;
$$;

create trigger votes_after_write_touch_result_signal
after insert or delete on public.votes
for each row
execute function public.touch_question_result_signal();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sessions'
    ) then
      alter publication supabase_realtime add table public.sessions;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'question_result_signals'
    ) then
      alter publication supabase_realtime add table public.question_result_signals;
    end if;
  end if;
end;
$$;
