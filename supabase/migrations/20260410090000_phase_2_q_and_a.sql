create table public.q_and_a_entries (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  participant_id text not null,
  text text not null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index q_and_a_entries_question_id_idx on public.q_and_a_entries (question_id, created_at desc);

create table public.q_and_a_entry_upvotes (
  entry_id uuid not null references public.q_and_a_entries(id) on delete cascade,
  participant_id text not null,
  created_at timestamptz not null default now(),
  primary key (entry_id, participant_id)
);

revoke all on public.q_and_a_entries from anon, authenticated;
revoke all on public.q_and_a_entry_upvotes from anon, authenticated;

alter table public.q_and_a_entries enable row level security;
alter table public.q_and_a_entry_upvotes enable row level security;

create or replace function public.submit_q_and_a_entry(target_question_id uuid, entry_text text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed_entry_text text := trim(entry_text);
  question_type text;
  is_voting_open boolean;
  requesting_id text := public.requesting_participant_id();
  new_entry_id uuid;
begin
  if requesting_id is null then
    raise exception 'participant mismatch';
  end if;

  select q.type, s.voting_open
  into question_type, is_voting_open
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where q.id = target_question_id;

  if question_type is null then
    raise exception 'question not found';
  end if;

  if question_type <> 'q_and_a' then
    raise exception 'question type mismatch';
  end if;

  if not is_voting_open then
    raise exception 'voting is closed';
  end if;

  if trimmed_entry_text = '' then
    raise exception 'a question is required';
  end if;

  if char_length(trimmed_entry_text) > 280 then
    raise exception 'question is too long';
  end if;

  insert into public.q_and_a_entries (question_id, participant_id, text)
  values (target_question_id, requesting_id, trimmed_entry_text)
  returning id into new_entry_id;

  return new_entry_id;
end;
$$;

create or replace function public.upvote_q_and_a_entry(target_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_owner_participant_id text;
  question_type text;
  is_voting_open boolean;
  requesting_id text := public.requesting_participant_id();
begin
  if requesting_id is null then
    raise exception 'participant mismatch';
  end if;

  select e.participant_id, q.type, s.voting_open
  into entry_owner_participant_id, question_type, is_voting_open
  from public.q_and_a_entries e
  join public.questions q on q.id = e.question_id
  join public.sessions s on s.id = q.session_id
  where e.id = target_entry_id;

  if question_type is null then
    raise exception 'entry not found';
  end if;

  if question_type <> 'q_and_a' then
    raise exception 'question type mismatch';
  end if;

  if not is_voting_open then
    raise exception 'voting is closed';
  end if;

  if entry_owner_participant_id = requesting_id then
    raise exception 'participants cannot upvote their own question';
  end if;

  insert into public.q_and_a_entry_upvotes (entry_id, participant_id)
  values (target_entry_id, requesting_id)
  on conflict (entry_id, participant_id) do nothing;
end;
$$;

create or replace function public.set_q_and_a_entry_answered(target_entry_id uuid, next_answered boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.q_and_a_entries e
  set answered_at = case when next_answered then clock_timestamp() else null end
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where e.id = target_entry_id
    and q.id = e.question_id
    and s.host_id = auth.uid();

  if not found then
    raise exception 'entry not found or not authorized';
  end if;
end;
$$;

revoke all on function public.submit_q_and_a_entry(uuid, text) from public;
revoke all on function public.upvote_q_and_a_entry(uuid) from public;
revoke all on function public.set_q_and_a_entry_answered(uuid, boolean) from public;
grant execute on function public.submit_q_and_a_entry(uuid, text) to anon, authenticated;
grant execute on function public.upvote_q_and_a_entry(uuid) to anon, authenticated;
grant execute on function public.set_q_and_a_entry_answered(uuid, boolean) to authenticated;

create or replace function public.touch_q_and_a_upvote_result_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_question_id uuid;
begin
  select question_id
  into target_question_id
  from public.q_and_a_entries
  where id = coalesce(new.entry_id, old.entry_id);

  if target_question_id is null then
    return null;
  end if;

  insert into public.question_result_signals (question_id, version, updated_at)
  values (target_question_id, 1, clock_timestamp())
  on conflict (question_id) do update
    set version = public.question_result_signals.version + 1,
        updated_at = clock_timestamp();

  return null;
end;
$$;

create trigger q_and_a_entries_after_write_touch_result_signal
after insert or update or delete on public.q_and_a_entries
for each row
execute function public.touch_question_result_signal();

create trigger q_and_a_entry_upvotes_after_write_touch_result_signal
after insert or delete on public.q_and_a_entry_upvotes
for each row
execute function public.touch_q_and_a_upvote_result_signal();

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
  elsif question_type = 'scales' then
    select jsonb_build_object(
      'questionId', target_question_id,
      'type', question_type,
      'title', question_title,
      'config', question_config,
      'average',
      coalesce(
        (
          select round(avg((value ->> 'rating')::numeric), 2)
          from public.votes
          where question_id = target_question_id
            and coalesce(value ->> 'rating', '') ~ '^[1-5]$'
        ),
        0
      ),
      'distribution',
      coalesce(
        (
          with scale_rows as (
            select generate_series(1, 5) as rating
          ),
          counts as (
            select (value ->> 'rating')::int as rating, count(*)::int as total_votes
            from public.votes
            where question_id = target_question_id
              and coalesce(value ->> 'rating', '') ~ '^[1-5]$'
            group by (value ->> 'rating')::int
          )
          select jsonb_agg(
            jsonb_build_object(
              'rating', scale_rows.rating,
              'count', coalesce(counts.total_votes, 0)
            )
            order by scale_rows.rating
          )
          from scale_rows
          left join counts using (rating)
        ),
        '[]'::jsonb
      )
    )
    into results;
  elsif question_type = 'q_and_a' then
    select jsonb_build_object(
      'questionId', target_question_id,
      'type', question_type,
      'title', question_title,
      'config', question_config,
      'entries',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', entry_rows.id,
              'text', entry_rows.text,
              'createdAt', entry_rows.created_at,
              'answered', entry_rows.answered,
              'upvoteCount', entry_rows.upvote_count,
              'hasUpvoted', entry_rows.has_upvoted,
              'isOwnEntry', entry_rows.is_own_entry
            )
            order by entry_rows.answered asc, entry_rows.upvote_count desc, entry_rows.created_at asc
          )
          from (
            select
              e.id,
              e.text,
              e.created_at,
              (e.answered_at is not null) as answered,
              count(u.entry_id)::int as upvote_count,
              coalesce(bool_or(u.participant_id = public.requesting_participant_id()), false) as has_upvoted,
              (e.participant_id = public.requesting_participant_id()) as is_own_entry
            from public.q_and_a_entries e
            left join public.q_and_a_entry_upvotes u on u.entry_id = e.id
            where e.question_id = target_question_id
            group by e.id
          ) entry_rows
        ),
        '[]'::jsonb
      )
    )
    into results;
  elsif question_type = 'open_ended' then
    select jsonb_build_object(
      'questionId', target_question_id,
      'type', question_type,
      'title', question_title,
      'config', question_config,
      'responses',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', response_rows.id,
              'text', response_rows.text,
              'createdAt', response_rows.created_at
            )
            order by response_rows.created_at desc
          )
          from (
            select id, trim(value ->> 'text') as text, created_at
            from public.votes
            where question_id = target_question_id
              and coalesce(trim(value ->> 'text'), '') <> ''
            order by created_at desc
            limit 50
          ) response_rows
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
