create or replace function public.touch_question_result_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_question_id uuid := coalesce(new.question_id, old.question_id);
begin
  if target_question_id is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.questions
    where id = target_question_id
  ) then
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
