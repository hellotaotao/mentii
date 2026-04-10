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
  quiz_correct_option_idx integer;
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
  elsif question_type = 'quiz' then
    quiz_correct_option_idx := least(
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

    with option_rows as (
      select option_ordinality - 1 as option_idx, option_value
      from jsonb_array_elements(coalesce(question_config -> 'options', '[]'::jsonb))
      with ordinality as options(option_value, option_ordinality)
    ),
    counts as (
      select (value ->> 'optionIdx')::int as option_idx, count(*)::int as total_votes
      from public.votes
      where question_id = target_question_id
        and coalesce(value ->> 'optionIdx', '') ~ '^[0-9]+$'
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
      ),
      'leaderboard',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'participantId', leaderboard_rows.participant_id,
              'label', leaderboard_rows.label,
              'answeredAt', leaderboard_rows.answered_at
            )
            order by leaderboard_rows.answered_at asc
          )
          from (
            select
              fastest_correct_answers.participant_id,
              fastest_correct_answers.answered_at,
              format('Player %s', row_number() over (order by fastest_correct_answers.answered_at asc)) as label
            from (
              select participant_id, min(created_at) as answered_at
              from public.votes
              where question_id = target_question_id
                and coalesce(value ->> 'optionIdx', '') ~ '^[0-9]+$'
                and (value ->> 'optionIdx')::int = quiz_correct_option_idx
              group by participant_id
              order by min(created_at) asc
              limit 5
            ) fastest_correct_answers
          ) leaderboard_rows
        ),
        '[]'::jsonb
      )
    )
    into results
    from option_rows
    left join counts using (option_idx);
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
