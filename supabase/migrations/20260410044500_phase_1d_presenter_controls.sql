create or replace function public.reset_question_votes(target_question_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owning_host_id uuid;
begin
  select s.host_id
  into owning_host_id
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where q.id = target_question_id;

  if owning_host_id is null then
    raise exception 'question not found';
  end if;

  if auth.uid() is distinct from owning_host_id then
    raise exception 'not allowed';
  end if;

  delete from public.votes
  where question_id = target_question_id;
end;
$$;

revoke all on function public.reset_question_votes(uuid) from public;
grant execute on function public.reset_question_votes(uuid) to authenticated;
