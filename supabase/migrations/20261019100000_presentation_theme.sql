-- Presentation theme chosen per room; drives slides, the big screen and audience phones.
alter table public.sessions
  add column if not exists theme text not null default 'light'
  check (theme in ('light', 'dark'));

-- Duplicated rooms keep the source room's theme.
create or replace function public.duplicate_room(source_session_id uuid, next_room_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owning_host_id uuid;
  new_session_id uuid;
  first_question_id uuid;
  trimmed_room_name text := left(nullif(btrim(coalesce(next_room_name, '')), ''), 120);
  attempt int := 0;
begin
  select host_id into owning_host_id
  from public.sessions
  where id = source_session_id;

  if owning_host_id is null then
    raise exception 'room not found';
  end if;

  if auth.uid() is distinct from owning_host_id then
    raise exception 'not allowed';
  end if;

  loop
    attempt := attempt + 1;

    begin
      insert into public.sessions (code, host_id, name, state, voting_open, results_hidden, theme)
      values (
        lpad(floor(random() * 1000000)::int::text, 6, '0'),
        owning_host_id,
        coalesce(trimmed_room_name, 'Untitled room'),
        'draft',
        true,
        false,
        (select s.theme from public.sessions s where s.id = source_session_id)
      )
      returning id into new_session_id;

      exit;
    exception
      when unique_violation then
        if attempt >= 10 then
          raise exception 'unable to generate a unique session code';
        end if;
    end;
  end loop;

  insert into public.questions (session_id, type, title, config, order_index)
  select new_session_id, q.type, q.title, q.config, q.order_index
  from public.questions q
  where q.session_id = source_session_id;

  select id into first_question_id
  from public.questions
  where session_id = new_session_id
  order by order_index
  limit 1;

  update public.sessions
  set current_question_id = first_question_id
  where id = new_session_id;

  return new_session_id;
end;
$$;

