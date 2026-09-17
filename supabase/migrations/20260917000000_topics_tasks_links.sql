-- Rename roadmap graph tables to the product vocabulary and give the
-- roadmap (role) first-class notes plus role-level links.

alter table public.roles
  add column if not exists notes text;

alter table public.roadmap_nodes rename to topics;

alter index if exists public.roadmap_nodes_role_id_idx rename to topics_role_id_idx;
alter index if exists public.roadmap_nodes_parent_id_idx rename to topics_parent_id_idx;
alter index if exists public.roadmap_nodes_role_id_parent_id_idx rename to topics_role_id_parent_id_idx;

alter table public.topics rename column accent_color to color;

do $$
begin
  alter table public.topics rename constraint roadmap_nodes_pkey to topics_pkey;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.topics rename constraint roadmap_nodes_role_id_fkey to topics_role_id_fkey;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.topics rename constraint roadmap_nodes_parent_id_fkey to topics_parent_id_fkey;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.topics rename constraint roadmap_nodes_title_not_blank to topics_title_not_blank;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.topics rename constraint roadmap_nodes_not_self_parent to topics_not_self_parent;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.topics rename constraint roadmap_nodes_handle_kind_allowed to topics_handle_kind_allowed;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.topics rename constraint roadmap_nodes_kind_allowed to topics_kind_allowed;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.topics rename constraint roadmap_nodes_labels_are_roots to topics_labels_are_roots;
exception when undefined_object then null;
end $$;

alter table public.topics drop constraint if exists roadmap_nodes_accent_color_hex;
alter table public.topics drop constraint if exists topics_color_hex;
alter table public.topics
  add constraint topics_color_hex check (
    color is null or color ~ '^#[0-9a-f]{6}$'
  );

alter trigger roadmap_nodes_set_updated_at on public.topics rename to topics_set_updated_at;

alter policy roadmap_nodes_deny_client on public.topics rename to topics_deny_client;

alter table public.checklist_items rename to tasks;

alter index if exists public.checklist_items_node_id_idx rename to tasks_topic_id_idx;
alter index if exists public.checklist_items_node_id_sort_order_idx rename to tasks_topic_id_sort_order_idx;

alter table public.tasks rename column node_id to topic_id;
alter table public.tasks rename column is_completed to completed;

do $$
begin
  alter table public.tasks rename constraint checklist_items_pkey to tasks_pkey;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.tasks rename constraint checklist_items_node_id_fkey to tasks_topic_id_fkey;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.tasks rename constraint checklist_items_title_not_blank to tasks_title_not_blank;
exception when undefined_object then null;
end $$;

alter trigger checklist_items_set_updated_at on public.tasks rename to tasks_set_updated_at;

alter policy checklist_items_deny_client on public.tasks rename to tasks_deny_client;

alter table public.node_links rename to links;

alter index if exists public.node_links_node_id_idx rename to links_topic_id_idx;

alter table public.links rename column node_id to topic_id;
alter table public.links
  add column if not exists role_id uuid;

update public.links as link
set role_id = topic.role_id
from public.topics as topic
where topic.id = link.topic_id
  and link.role_id is null;

alter table public.links
  alter column role_id set not null;

alter table public.links
  alter column topic_id drop not null;

alter table public.links
  drop constraint if exists node_links_node_id_fkey;

alter table public.links
  drop constraint if exists links_topic_id_fkey;

alter table public.links
  add constraint links_topic_id_fkey
    foreign key (topic_id) references public.topics (id) on delete cascade;

alter table public.links
  drop constraint if exists links_role_id_fkey;

alter table public.links
  add constraint links_role_id_fkey
    foreign key (role_id) references public.roles (id) on delete cascade;

create index if not exists links_role_id_idx on public.links (role_id);
create index if not exists links_role_id_topic_id_idx on public.links (role_id, topic_id);

do $$
begin
  alter table public.links rename constraint node_links_pkey to links_pkey;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.links rename constraint node_links_label_not_blank to links_label_not_blank;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.links rename constraint node_links_url_not_blank to links_url_not_blank;
exception when undefined_object then null;
end $$;

alter trigger node_links_set_updated_at on public.links rename to links_set_updated_at;

alter policy node_links_deny_client on public.links rename to links_deny_client;

revoke all on table public.topics from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.links from anon, authenticated;

-- Promote the old hidden single-root container: copy notes/links onto the
-- role, lift children to the top level, then delete the empty root.
with root_counts as (
  select role_id
  from public.topics
  where parent_id is null
    and kind is distinct from 'label'
  group by role_id
  having count(*) = 1
),
empty_roots as (
  select
    topic.role_id,
    topic.id as root_id,
    topic.notes as root_notes
  from public.topics as topic
  join root_counts on root_counts.role_id = topic.role_id
  where topic.parent_id is null
    and topic.kind is distinct from 'label'
    and not exists (
      select 1 from public.tasks as task where task.topic_id = topic.id
    )
)
update public.roles as role
set notes = coalesce(nullif(btrim(role.notes), ''), empty_roots.root_notes)
from empty_roots
where role.id = empty_roots.role_id;

with root_counts as (
  select role_id
  from public.topics
  where parent_id is null
    and kind is distinct from 'label'
  group by role_id
  having count(*) = 1
),
empty_roots as (
  select topic.id as root_id
  from public.topics as topic
  join root_counts on root_counts.role_id = topic.role_id
  where topic.parent_id is null
    and topic.kind is distinct from 'label'
    and not exists (
      select 1 from public.tasks as task where task.topic_id = topic.id
    )
)
update public.links as link
set topic_id = null
from empty_roots
where link.topic_id = empty_roots.root_id;

with root_counts as (
  select role_id
  from public.topics
  where parent_id is null
    and kind is distinct from 'label'
  group by role_id
  having count(*) = 1
),
empty_roots as (
  select topic.id as root_id
  from public.topics as topic
  join root_counts on root_counts.role_id = topic.role_id
  where topic.parent_id is null
    and topic.kind is distinct from 'label'
    and not exists (
      select 1 from public.tasks as task where task.topic_id = topic.id
    )
)
update public.topics as topic
set parent_id = null
from empty_roots
where topic.parent_id = empty_roots.root_id;

with root_counts as (
  select role_id
  from public.topics
  where parent_id is null
    and kind is distinct from 'label'
  group by role_id
  having count(*) = 1
),
empty_roots as (
  select topic.id as root_id
  from public.topics as topic
  join root_counts on root_counts.role_id = topic.role_id
  where topic.parent_id is null
    and topic.kind is distinct from 'label'
    and not exists (
      select 1 from public.tasks as task where task.topic_id = topic.id
    )
    and not exists (
      select 1 from public.topics as child where child.parent_id = topic.id
    )
)
delete from public.topics as topic
using empty_roots
where topic.id = empty_roots.root_id;
