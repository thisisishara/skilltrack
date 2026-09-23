-- Topic notes are a list of titled markdown documents, not one text field.

create table public.topic_notes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  title text not null,
  body text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topic_notes_title_not_blank check (char_length(btrim(title)) between 1 and 80)
);

create index topic_notes_topic_id_sort_order_idx
  on public.topic_notes (topic_id, sort_order, created_at);

create trigger topic_notes_set_updated_at
  before update on public.topic_notes
  for each row execute function public.set_updated_at();

alter table public.topic_notes enable row level security;

revoke all on table public.topic_notes from anon, authenticated;

create policy topic_notes_deny_client on public.topic_notes
  for all to anon, authenticated
  using (false)
  with check (false);

insert into public.topic_notes (topic_id, title, body, sort_order)
select
  headed.id,
  coalesce(nullif(left(btrim(coalesce(headed.raw_title, '')), 80), ''), 'Notes'),
  headed.notes,
  0
from (
  select
    id,
    notes,
    case
      when btrim(notes) ~ '^#{1,6}[[:space:]]+\S'
      then btrim(
        regexp_replace(
          substring(btrim(notes) from '^#{1,6}[[:space:]]+([^\r\n]+)'),
          '[[:space:]]+#+$',
          ''
        )
      )
      else 'Notes'
    end as raw_title
  from public.topics
  where notes is not null and btrim(notes) <> ''
) as headed;

alter table public.topics drop column notes;
