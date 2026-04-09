create extension if not exists pgcrypto;

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[0-9]{6}$'),
  host_id uuid references auth.users(id) on delete set null,
  current_question_id uuid,
  state text not null default 'draft' check (state in ('draft', 'live', 'ended')),
  voting_open boolean not null default true,
  results_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  type text not null check (type in ('multiple_choice', 'word_cloud', 'open_ended', 'scales', 'q_and_a', 'quiz')),
  title text not null,
  config jsonb not null default '{}'::jsonb,
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, order_index)
);

alter table public.sessions
  add constraint sessions_current_question_id_fkey
  foreign key (current_question_id)
  references public.questions(id)
  on delete set null;

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  participant_id text not null,
  value jsonb not null,
  created_at timestamptz not null default now()
);

create index questions_session_id_order_index_idx on public.questions (session_id, order_index);
create index votes_question_id_idx on public.votes (question_id);
create index votes_question_id_participant_id_idx on public.votes (question_id, participant_id);

grant usage on schema public to anon, authenticated;
grant select (id, code, current_question_id, state, voting_open, results_hidden, created_at)
on public.sessions to anon;
grant select (id, session_id, type, title, config, order_index, created_at)
on public.questions to anon;
grant all on public.sessions to authenticated;
grant all on public.questions to authenticated;

create or replace function public.requesting_participant_id()
returns text
language sql
stable
as $$
  with headers as (
    select nullif(current_setting('request.headers', true), '')::jsonb as payload
  )
  select nullif(coalesce(payload ->> 'x-participant-id', ''), '')
  from headers;
$$;

create or replace function public.enforce_vote_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  question_type text;
  question_config jsonb;
  is_voting_open boolean;
  submission_mode text;
begin
  if public.requesting_participant_id() is distinct from new.participant_id then
    raise exception 'participant mismatch';
  end if;

  select q.type, q.config, s.voting_open
  into question_type, question_config, is_voting_open
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where q.id = new.question_id;

  if question_type is null then
    raise exception 'question not found';
  end if;

  if not is_voting_open then
    raise exception 'voting is closed';
  end if;

  submission_mode := coalesce(
    question_config ->> 'submissionMode',
    case when question_type = 'word_cloud' then 'multiple' else 'single' end
  );

  if submission_mode = 'single' then
    delete from public.votes
    where question_id = new.question_id
      and participant_id = new.participant_id;
  end if;

  return new;
end;
$$;

create trigger votes_before_insert
before insert on public.votes
for each row
execute function public.enforce_vote_rules();

create or replace function public.get_question_results(target_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  question_type text;
  question_title text;
  question_config jsonb;
  results jsonb;
begin
  select type, title, config
  into question_type, question_title, question_config
  from public.questions
  where id = target_question_id;

  if question_type is null then
    raise exception 'question not found';
  end if;

  if question_type = 'multiple_choice' then
    with option_rows as (
      select option_ordinality - 1 as option_idx, option_value
      from jsonb_array_elements(coalesce(question_config -> 'options', '[]'::jsonb))
      with ordinality as options(option_value, option_ordinality)
    ),
    counts as (
      select (value ->> 'optionIdx')::int as option_idx, count(*)::int as total_votes
      from public.votes
      where question_id = target_question_id
      group by (value ->> 'optionIdx')::int
    )
    select jsonb_build_object(
      'questionId', target_question_id,
      'type', question_type,
      'title', question_title,
      'config', question_config,
      'totals',
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'optionIdx', option_rows.option_idx,
            'label', coalesce(option_rows.option_value ->> 'label', format('Option %s', option_rows.option_idx + 1)),
            'count', coalesce(counts.total_votes, 0)
          )
          order by option_rows.option_idx
        ),
        '[]'::jsonb
      )
    )
    into results
    from option_rows
    left join counts using (option_idx);
  elsif question_type = 'word_cloud' then
    select jsonb_build_object(
      'questionId', target_question_id,
      'type', question_type,
      'title', question_title,
      'config', question_config,
      'words',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object('word', word, 'count', total_votes)
            order by total_votes desc, word asc
          )
          from (
            select lower(trim(value ->> 'word')) as word, count(*)::int as total_votes
            from public.votes
            where question_id = target_question_id
              and coalesce(trim(value ->> 'word'), '') <> ''
            group by lower(trim(value ->> 'word'))
          ) words
        ),
        '[]'::jsonb
      )
    )
    into results;
  else
    select jsonb_build_object(
      'questionId', target_question_id,
      'type', question_type,
      'title', question_title,
      'config', question_config,
      'responses', '[]'::jsonb
    )
    into results;
  end if;

  return results;
end;
$$;

revoke all on public.votes from anon, authenticated;
grant insert on public.votes to anon, authenticated;
revoke all on function public.get_question_results(uuid) from public;
grant execute on function public.get_question_results(uuid) to anon, authenticated;

alter table public.sessions enable row level security;
alter table public.questions enable row level security;
alter table public.votes enable row level security;

create policy sessions_host_manage
on public.sessions
for all
to authenticated
using (auth.uid() = host_id)
with check (auth.uid() = host_id);

create policy sessions_public_read
on public.sessions
for select
to anon
using (true);

create policy questions_host_manage
on public.questions
for all
to authenticated
using (
  exists (
    select 1
    from public.sessions s
    where s.id = questions.session_id
      and s.host_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = questions.session_id
      and s.host_id = auth.uid()
  )
);

create policy questions_public_read
on public.questions
for select
to anon
using (
  exists (
    select 1
    from public.sessions s
    where s.id = questions.session_id
  )
);

create policy votes_insert_own_participant
on public.votes
for insert
to anon, authenticated
with check (participant_id = public.requesting_participant_id());
