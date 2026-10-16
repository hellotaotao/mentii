-- Quiz game: nicknames, server-side scoring, cumulative leaderboard, leaderboard slides.

-- 1. Leaderboard slides -------------------------------------------------------

alter table public.questions drop constraint questions_type_check;

alter table public.questions
  add constraint questions_type_check
  check (type in ('multiple_choice', 'word_cloud', 'open_ended', 'scales', 'q_and_a', 'quiz', 'leaderboard'));

-- 2. Participants -------------------------------------------------------------

create table public.participants (
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id text not null,
  nickname text not null check (char_length(nickname) between 1 and 24),
  emoji text not null default '🙂' check (char_length(emoji) between 1 and 16),
  real_name text check (real_name is null or char_length(real_name) between 1 and 60),
  joined_at timestamptz not null default now(),
  primary key (session_id, participant_id)
);

create unique index participants_session_nickname_idx
  on public.participants (session_id, lower(nickname));

revoke all on public.participants from anon, authenticated;
alter table public.participants enable row level security;

create or replace function public.participant_profile_json(target_session_id uuid, target_participant_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nickname', p.nickname,
    'emoji', p.emoji,
    'realName', p.real_name
  )
  from public.participants p
  where p.session_id = target_session_id
    and p.participant_id = target_participant_id;
$$;

revoke all on function public.participant_profile_json(uuid, text) from public, anon, authenticated;

create or replace function public.join_session(target_session_id uuid, next_nickname text, next_emoji text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  requesting_id text := public.requesting_participant_id();
  session_state text;
  trimmed_nickname text := btrim(coalesce(next_nickname, ''));
  trimmed_emoji text := btrim(coalesce(next_emoji, ''));
begin
  if requesting_id is null then
    raise exception 'participant mismatch';
  end if;

  select state into session_state
  from public.sessions
  where id = target_session_id;

  if session_state is null then
    raise exception 'session not found';
  end if;

  if session_state = 'ended' then
    raise exception 'session has ended';
  end if;

  if trimmed_nickname = '' then
    raise exception 'a nickname is required';
  end if;

  if char_length(trimmed_nickname) > 24 then
    raise exception 'nickname is too long';
  end if;

  if trimmed_emoji = '' or char_length(trimmed_emoji) > 16 then
    trimmed_emoji := '🙂';
  end if;

  if exists (
    select 1
    from public.participants p
    where p.session_id = target_session_id
      and lower(p.nickname) = lower(trimmed_nickname)
      and p.participant_id <> requesting_id
  ) then
    raise exception 'nickname is taken';
  end if;

  insert into public.participants (session_id, participant_id, nickname, emoji)
  values (target_session_id, requesting_id, trimmed_nickname, trimmed_emoji)
  on conflict (session_id, participant_id) do update
    set nickname = excluded.nickname,
        emoji = excluded.emoji;

  return public.participant_profile_json(target_session_id, requesting_id);
exception
  when unique_violation then
    raise exception 'nickname is taken';
end;
$$;

create or replace function public.get_my_participant(target_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.participant_profile_json(target_session_id, public.requesting_participant_id());
$$;

create or replace function public.set_participant_real_name(target_session_id uuid, next_real_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  requesting_id text := public.requesting_participant_id();
  trimmed_real_name text := nullif(btrim(coalesce(next_real_name, '')), '');
begin
  if requesting_id is null then
    raise exception 'participant mismatch';
  end if;

  if trimmed_real_name is not null and char_length(trimmed_real_name) > 60 then
    raise exception 'name is too long';
  end if;

  update public.participants
  set real_name = trimmed_real_name
  where session_id = target_session_id
    and participant_id = requesting_id;

  if not found then
    raise exception 'join the session first';
  end if;

  return public.participant_profile_json(target_session_id, requesting_id);
end;
$$;

revoke all on function public.join_session(uuid, text, text) from public;
revoke all on function public.get_my_participant(uuid) from public;
revoke all on function public.set_participant_real_name(uuid, text) from public;
grant execute on function public.join_session(uuid, text, text) to anon, authenticated;
grant execute on function public.get_my_participant(uuid) to anon, authenticated;
grant execute on function public.set_participant_real_name(uuid, text) to anon, authenticated;

-- 3. Server clock for question cycles -----------------------------------------
-- Hosts send their local clock; scoring must use the database clock instead.

create or replace function public.normalize_question_cycle_started_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.question_cycle_started_at is distinct from old.question_cycle_started_at
    or new.current_question_id is distinct from old.current_question_id then
    new.question_cycle_started_at := clock_timestamp();
  end if;

  return new;
end;
$$;

create trigger sessions_before_update_normalize_cycle
before update on public.sessions
for each row
execute function public.normalize_question_cycle_started_at();

-- 4. Vote rules with quiz scoring ---------------------------------------------

create or replace function public.quiz_duration_seconds(question_config jsonb)
returns int
language sql
immutable
as $$
  select case
    when coalesce(question_config ->> 'durationSeconds', '') ~ '^[0-9]+$'
      then greatest(5, least(120, (question_config ->> 'durationSeconds')::int))
    else 30
  end;
$$;

create or replace function public.quiz_correct_option_idx(question_config jsonb)
returns int
language sql
immutable
as $$
  select least(
    greatest(
      case
        when coalesce(question_config ->> 'correctOptionIdx', '') ~ '^[0-9]+$'
          then (question_config ->> 'correctOptionIdx')::int
        else 0
      end,
      0
    ),
    greatest(jsonb_array_length(coalesce(question_config -> 'options', '[]'::jsonb)) - 1, 0)
  );
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
  session_state text;
  session_id_value uuid;
  active_question_id uuid;
  cycle_started_at timestamptz;
  submission_mode text;
  option_idx int;
  option_count int;
  open_ended_max_length int;
  trimmed_text text;
  duration_seconds int;
  elapsed_seconds numeric;
  is_correct boolean;
  awarded_points int;
begin
  if public.requesting_participant_id() is distinct from new.participant_id then
    raise exception 'participant mismatch';
  end if;

  select q.type, q.config, s.state, s.voting_open, s.id, s.current_question_id, s.question_cycle_started_at
  into question_type, question_config, session_state, is_voting_open, session_id_value, active_question_id, cycle_started_at
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where q.id = new.question_id;

  if question_type is null then
    raise exception 'question not found';
  end if;

  if question_type = 'leaderboard' then
    raise exception 'this slide does not accept responses';
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

  if question_type = 'quiz' then
    if active_question_id is distinct from new.question_id then
      raise exception 'this question is not active';
    end if;

    if not exists (
      select 1
      from public.participants p
      where p.session_id = session_id_value
        and p.participant_id = new.participant_id
    ) then
      raise exception 'join with a nickname first';
    end if;

    -- Serialize answers per participant so a double tap cannot score twice.
    perform pg_advisory_xact_lock(hashtextextended(new.question_id::text || ':' || new.participant_id, 0));

    if exists (
      select 1
      from public.votes v
      where v.question_id = new.question_id
        and v.participant_id = new.participant_id
    ) then
      raise exception 'you already answered this question';
    end if;

    duration_seconds := public.quiz_duration_seconds(question_config);
    elapsed_seconds := extract(epoch from clock_timestamp() - cycle_started_at);

    -- Small grace window for network latency; this is a party game, not a race.
    if elapsed_seconds > duration_seconds + 2 then
      raise exception 'time is up';
    end if;

    elapsed_seconds := greatest(0, least(elapsed_seconds, duration_seconds));
    is_correct := option_idx = public.quiz_correct_option_idx(question_config);
    awarded_points := case
      when is_correct then round(1000 * (1 - (elapsed_seconds / duration_seconds) / 2))::int
      else 0
    end;

    new.value := jsonb_build_object(
      'optionIdx', option_idx,
      'correct', is_correct,
      'points', awarded_points,
      'elapsedMs', round(elapsed_seconds * 1000)::int
    );

    return new;
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

-- 5. Scoreboard -------------------------------------------------------------

-- Internal helper: one row per participant with cumulative and "before the
-- latest quiz question" standings, so clients can animate rank changes.
create or replace function public.quiz_scoreboard(target_session_id uuid)
returns table (
  participant_id text,
  nickname text,
  emoji text,
  real_name text,
  score int,
  correct_count int,
  last_points int,
  answered_last boolean,
  rank int,
  previous_rank int
)
language sql
stable
security definer
set search_path = public
as $$
  with current_slide as (
    select q.order_index
    from public.sessions s
    join public.questions q on q.id = s.current_question_id
    where s.id = target_session_id
  ),
  last_quiz as (
    select q.id
    from public.questions q
    where q.session_id = target_session_id
      and q.type = 'quiz'
      and q.order_index <= coalesce((select order_index from current_slide), 2147483647)
    order by q.order_index desc
    limit 1
  ),
  quiz_votes as (
    select
      v.participant_id,
      v.question_id,
      coalesce((v.value ->> 'points')::int, 0) as points,
      coalesce((v.value ->> 'correct')::boolean, false) as correct,
      coalesce((v.value ->> 'elapsedMs')::int, 0) as elapsed_ms
    from public.votes v
    join public.questions q on q.id = v.question_id
    where q.session_id = target_session_id
      and q.type = 'quiz'
  ),
  totals as (
    select
      p.participant_id,
      p.nickname,
      p.emoji,
      p.real_name,
      p.joined_at,
      coalesce(sum(qv.points), 0)::int as score,
      count(qv.question_id) filter (where qv.correct)::int as correct_count,
      coalesce(sum(qv.points) filter (where qv.question_id = (select id from last_quiz)), 0)::int as last_points,
      coalesce(bool_or(qv.question_id = (select id from last_quiz)), false) as answered_last,
      coalesce(sum(qv.elapsed_ms) filter (where qv.correct), 0)::bigint as total_elapsed_ms,
      coalesce(sum(qv.elapsed_ms) filter (where qv.correct and qv.question_id = (select id from last_quiz)), 0)::bigint
        as last_elapsed_ms
    from public.participants p
    left join quiz_votes qv on qv.participant_id = p.participant_id
    where p.session_id = target_session_id
    group by p.participant_id, p.nickname, p.emoji, p.real_name, p.joined_at
  )
  select
    t.participant_id,
    t.nickname,
    t.emoji,
    t.real_name,
    t.score,
    t.correct_count,
    t.last_points,
    t.answered_last,
    (row_number() over (order by t.score desc, t.total_elapsed_ms asc, t.joined_at asc))::int as rank,
    (row_number() over (
      order by t.score - t.last_points desc, t.total_elapsed_ms - t.last_elapsed_ms asc, t.joined_at asc
    ))::int as previous_rank
  from totals t;
$$;

revoke all on function public.quiz_scoreboard(uuid) from public, anon, authenticated;

create or replace function public.can_view_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sessions s
    where s.id = target_session_id
      and (s.state <> 'draft' or s.host_id = auth.uid())
  );
$$;

revoke all on function public.can_view_session(uuid) from public, anon, authenticated;

create or replace function public.get_quiz_leaderboard(target_session_id uuid, max_entries int default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.can_view_session(target_session_id) then
    raise exception 'session not found';
  end if;

  select jsonb_build_object(
    'totalPlayers', (select count(*) from public.participants p where p.session_id = target_session_id),
    'entries', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'participantId', b.participant_id,
          'nickname', b.nickname,
          'emoji', b.emoji,
          -- Real names are opt-in and only shown for the podium.
          'realName', case when b.rank <= 3 then b.real_name end,
          'score', b.score,
          'correctCount', b.correct_count,
          'lastPoints', b.last_points,
          'rank', b.rank,
          'previousRank', b.previous_rank
        )
        order by b.rank
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.quiz_scoreboard(target_session_id) b
  where b.rank <= greatest(1, least(coalesce(max_entries, 10), 50));

  return result;
end;
$$;

create or replace function public.get_my_quiz_status(target_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  requesting_id text := public.requesting_participant_id();
  my_row record;
  player_count int;
  active_question_id uuid;
  active_question_type text;
  active_question_config jsonb;
  is_voting_open boolean;
  cycle_started_at timestamptz;
  my_vote jsonb;
  is_revealed boolean;
  current_answer jsonb := null;
begin
  if requesting_id is null then
    raise exception 'participant mismatch';
  end if;

  select * into my_row
  from public.quiz_scoreboard(target_session_id) b
  where b.participant_id = requesting_id;

  if not found then
    return null;
  end if;

  select count(*) into player_count
  from public.participants p
  where p.session_id = target_session_id;

  select s.current_question_id, q.type, q.config, s.voting_open, s.question_cycle_started_at
  into active_question_id, active_question_type, active_question_config, is_voting_open, cycle_started_at
  from public.sessions s
  left join public.questions q on q.id = s.current_question_id
  where s.id = target_session_id;

  if active_question_type = 'quiz' then
    select v.value into my_vote
    from public.votes v
    where v.question_id = active_question_id
      and v.participant_id = requesting_id
    limit 1;

    is_revealed := not is_voting_open
      or clock_timestamp() > cycle_started_at
        + make_interval(secs => public.quiz_duration_seconds(active_question_config));

    current_answer := jsonb_build_object(
      'questionId', active_question_id,
      'answered', my_vote is not null,
      'revealed', is_revealed,
      'optionIdx', (my_vote ->> 'optionIdx')::int,
      'correct', case when is_revealed and my_vote is not null then (my_vote ->> 'correct')::boolean end,
      'points', case when is_revealed and my_vote is not null then (my_vote ->> 'points')::int end,
      'correctOptionIdx', case when is_revealed then public.quiz_correct_option_idx(active_question_config) end
    );
  end if;

  return jsonb_build_object(
    'nickname', my_row.nickname,
    'emoji', my_row.emoji,
    'realName', my_row.real_name,
    -- Hide standings that would leak the answer while the question is still open.
    'score', case when current_answer is null or (current_answer ->> 'revealed')::boolean
      then my_row.score else my_row.score - my_row.last_points end,
    'rank', case when current_answer is null or (current_answer ->> 'revealed')::boolean
      then my_row.rank else my_row.previous_rank end,
    'totalPlayers', player_count,
    'currentAnswer', current_answer
  );
end;
$$;

revoke all on function public.get_quiz_leaderboard(uuid, int) from public;
revoke all on function public.get_my_quiz_status(uuid) from public;
grant execute on function public.get_quiz_leaderboard(uuid, int) to anon, authenticated;
grant execute on function public.get_my_quiz_status(uuid) to anon, authenticated;

-- 6. Reset a whole room so it can be rehearsed or reused next month -----------

create or replace function public.reset_session_results(target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owning_host_id uuid;
  first_question_id uuid;
begin
  select host_id into owning_host_id
  from public.sessions
  where id = target_session_id;

  if owning_host_id is null then
    raise exception 'session not found';
  end if;

  if auth.uid() is distinct from owning_host_id then
    raise exception 'not allowed';
  end if;

  delete from public.votes v
  using public.questions q
  where q.id = v.question_id
    and q.session_id = target_session_id;

  delete from public.q_and_a_entries e
  using public.questions q
  where q.id = e.question_id
    and q.session_id = target_session_id;

  delete from public.participants
  where session_id = target_session_id;

  select id into first_question_id
  from public.questions
  where session_id = target_session_id
  order by order_index
  limit 1;

  update public.sessions
  set state = 'draft',
      current_question_id = first_question_id,
      voting_open = true,
      results_hidden = false,
      question_cycle_started_at = clock_timestamp()
  where id = target_session_id;
end;
$$;

revoke all on function public.reset_session_results(uuid) from public;
grant execute on function public.reset_session_results(uuid) to authenticated;
