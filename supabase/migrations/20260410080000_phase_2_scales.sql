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

  if question_type = 'scales' and coalesce(new.value ->> 'rating', '') !~ '^[1-5]$' then
    raise exception 'rating must be between 1 and 5';
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
