alter table public.sessions
add column if not exists name text;

update public.sessions
set name = concat('Room ', code)
where name is null or btrim(name) = '';

alter table public.sessions
alter column name set default 'Untitled room';

alter table public.sessions
alter column name set not null;
