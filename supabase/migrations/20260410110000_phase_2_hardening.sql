alter table public.sessions
  add column if not exists question_cycle_started_at timestamptz not null default now();

grant select (question_cycle_started_at)
on public.sessions to anon, authenticated;

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
  session_state text;
  submission_mode text;
  option_idx int;
  option_count int;
  open_ended_max_length int;
  trimmed_text text;
begin
  if public.requesting_participant_id() is distinct from new.participant_id then
    raise exception 'participant mismatch';
  end if;

  select q.type, q.config, s.state, s.voting_open
  into question_type, question_config, session_state, is_voting_open
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where q.id = new.question_id;

  if question_type is null then
    raise exception 'question not found';
  end if;

  if session_state <> 'live' then
    raise exception 'session is not live';
  end if;

  if not is_voting_open then
    raise exception 'voting is closed';
  end if;

  if question_type in ('multiple_choice', 'quiz') then
    if coalesce(new.value ->> 'optionIdx', '') !~ '^[0-9]+$' then
      raise exception 'an answer option is required';
    end if;

    option_idx := (new.value ->> 'optionIdx')::int;
    option_count := coalesce(jsonb_array_length(question_config -> 'options'), 0);

    if option_idx < 0 or option_idx >= option_count then
      raise exception 'answer option is out of range';
    end if;
  end if;

  if question_type = 'word_cloud' then
    trimmed_text := btrim(coalesce(new.value ->> 'word', ''));

    if trimmed_text = '' then
      raise exception 'a word is required';
    end if;

    if char_length(trimmed_text) > 48 then
      raise exception 'word is too long';
    end if;
  end if;

  if question_type = 'open_ended' then
    trimmed_text := btrim(coalesce(new.value ->> 'text', ''));

    if trimmed_text = '' then
      raise exception 'a response is required';
    end if;

    open_ended_max_length := case
      when coalesce(question_config ->> 'maxLength', '') ~ '^[0-9]+$'
        then greatest(40, least(500, (question_config ->> 'maxLength')::int))
      else 280
    end;

    if char_length(trimmed_text) > open_ended_max_length then
      raise exception 'response is too long';
    end if;
  end if;

  if question_type = 'scales' and coalesce(new.value ->> 'rating', '') !~ '^[1-5]$' then
    raise exception 'rating must be between 1 and 5';
  end if;

  submission_mode := case
    when question_type = 'word_cloud' then
      case
        when question_config ->> 'allowMultipleSubmissions' = 'false' then 'single'
        when question_config ->> 'allowMultipleSubmissions' = 'true' then 'multiple'
        when question_config ->> 'submissionMode' in ('single', 'multiple') then question_config ->> 'submissionMode'
        else 'multiple'
      end
    else 'single'
  end;

  if submission_mode = 'single' then
    delete from public.votes
    where question_id = new.question_id
      and participant_id = new.participant_id;
  end if;

  return new;
end;
$$;

create or replace function public.submit_q_and_a_entry(target_question_id uuid, entry_text text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  question_type text;
  is_voting_open boolean;
  session_state text;
  trimmed_entry_text text := btrim(coalesce(entry_text, ''));
  requesting_id text := public.requesting_participant_id();
  new_entry_id uuid;
begin
  if requesting_id is null then
    raise exception 'participant mismatch';
  end if;

  select q.type, s.state, s.voting_open
  into question_type, session_state, is_voting_open
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where q.id = target_question_id;

  if question_type is null then
    raise exception 'question not found';
  end if;

  if question_type <> 'q_and_a' then
    raise exception 'question type mismatch';
  end if;

  if session_state <> 'live' then
    raise exception 'session is not live';
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
  session_state text;
  requesting_id text := public.requesting_participant_id();
begin
  if requesting_id is null then
    raise exception 'participant mismatch';
  end if;

  select e.participant_id, q.type, s.state, s.voting_open
  into entry_owner_participant_id, question_type, session_state, is_voting_open
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

  if session_state <> 'live' then
    raise exception 'session is not live';
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

create or replace function public.reset_question_results(target_question_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owning_host_id uuid;
  question_session_id uuid;
  question_type text;
begin
  select s.host_id, s.id, q.type
  into owning_host_id, question_session_id, question_type
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where q.id = target_question_id;

  if owning_host_id is null then
    raise exception 'question not found';
  end if;

  if auth.uid() is distinct from owning_host_id then
    raise exception 'not allowed';
  end if;

  if question_type = 'q_and_a' then
    delete from public.q_and_a_entries
    where question_id = target_question_id;
  else
    delete from public.votes
    where question_id = target_question_id;
  end if;

  update public.sessions
  set question_cycle_started_at = clock_timestamp()
  where id = question_session_id
    and current_question_id = target_question_id;
end;
$$;

create or replace function public.reset_question_votes(target_question_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.reset_question_results(target_question_id);
end;
$$;

revoke all on function public.reset_question_results(uuid) from public;
grant execute on function public.reset_question_results(uuid) to authenticated;

create or replace function public.reorder_questions(target_session_id uuid, ordered_question_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owning_host_id uuid;
  existing_question_count int;
  ordered_question_count int := coalesce(array_length(ordered_question_ids, 1), 0);
begin
  select host_id
  into owning_host_id
  from public.sessions
  where id = target_session_id;

  if owning_host_id is null then
    raise exception 'session not found';
  end if;

  if auth.uid() is distinct from owning_host_id then
    raise exception 'not allowed';
  end if;

  select count(*)
  into existing_question_count
  from public.questions
  where session_id = target_session_id;

  if ordered_question_count <> existing_question_count then
    raise exception 'reorder payload does not match the current slide set';
  end if;

  if coalesce((
    select count(distinct question_id)
    from unnest(ordered_question_ids) as ordered(question_id)
  ), 0) <> ordered_question_count then
    raise exception 'reorder payload contains duplicate question ids';
  end if;

  if exists (
    select 1
    from unnest(ordered_question_ids) as ordered(question_id)
    where not exists (
      select 1
      from public.questions q
      where q.session_id = target_session_id
        and q.id = ordered.question_id
    )
  ) then
    raise exception 'reorder payload contains questions outside this session';
  end if;

  update public.questions q
  set order_index = 10000 + ordered.position
  from (
    select question_id, ordinality - 1 as position
    from unnest(ordered_question_ids) with ordinality as ordered(question_id, ordinality)
  ) ordered
  where q.session_id = target_session_id
    and q.id = ordered.question_id;

  update public.questions q
  set order_index = ordered.position
  from (
    select question_id, ordinality - 1 as position
    from unnest(ordered_question_ids) with ordinality as ordered(question_id, ordinality)
  ) ordered
  where q.session_id = target_session_id
    and q.id = ordered.question_id;
end;
$$;

revoke all on function public.reorder_questions(uuid, uuid[]) from public;
grant execute on function public.reorder_questions(uuid, uuid[]) to authenticated;
