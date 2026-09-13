-- SkillTrack MVP schema (spec §25) and fail-closed RLS (spec §27).
-- Auth.js is the identity provider; the service-role key is used only from
-- the Next.js server. anon / authenticated must not read or write these tables.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  github_user_id text not null unique,
  github_username text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  normalized_name text generated always as (lower(btrim(name))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_name_not_blank check (btrim(name) <> ''),
  constraint roles_user_normalized_name_key unique (user_id, normalized_name)
);

create table public.roadmap_nodes (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  parent_id uuid references public.roadmap_nodes (id) on delete cascade,
  title text not null,
  description text,
  notes text,
  icon text not null default 'circle-dot',
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roadmap_nodes_title_not_blank check (btrim(title) <> ''),
  constraint roadmap_nodes_not_self_parent check (parent_id is distinct from id)
);

create index roadmap_nodes_role_id_idx on public.roadmap_nodes (role_id);
create index roadmap_nodes_parent_id_idx on public.roadmap_nodes (parent_id);
create index roadmap_nodes_role_id_parent_id_idx on public.roadmap_nodes (role_id, parent_id);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.roadmap_nodes (id) on delete cascade,
  title text not null,
  description text,
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint checklist_items_title_not_blank check (btrim(title) <> '')
);

create index checklist_items_node_id_idx on public.checklist_items (node_id);
create index checklist_items_node_id_sort_order_idx on public.checklist_items (node_id, sort_order);

create table public.node_links (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.roadmap_nodes (id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint node_links_label_not_blank check (btrim(label) <> ''),
  constraint node_links_url_not_blank check (btrim(url) <> '')
);

create index node_links_node_id_idx on public.node_links (node_id);

create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text not null,
  role_title text not null,
  source text,
  source_url text,
  description text not null,
  posted_at date,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_descriptions_company_not_blank check (btrim(company_name) <> ''),
  constraint job_descriptions_role_title_not_blank check (btrim(role_title) <> '')
);

create index job_descriptions_user_id_idx on public.job_descriptions (user_id);

create table public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_description_id uuid not null references public.job_descriptions (id) on delete cascade,
  skill_name text not null,
  importance text not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  constraint job_requirements_skill_not_blank check (btrim(skill_name) <> ''),
  constraint job_requirements_importance_check
    check (importance in ('required', 'preferred', 'unknown'))
);

create index job_requirements_job_description_id_idx
  on public.job_requirements (job_description_id);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

create trigger roadmap_nodes_set_updated_at
  before update on public.roadmap_nodes
  for each row execute function public.set_updated_at();

create trigger checklist_items_set_updated_at
  before update on public.checklist_items
  for each row execute function public.set_updated_at();

create trigger node_links_set_updated_at
  before update on public.node_links
  for each row execute function public.set_updated_at();

create trigger job_descriptions_set_updated_at
  before update on public.job_descriptions
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.roadmap_nodes enable row level security;
alter table public.checklist_items enable row level security;
alter table public.node_links enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.job_requirements enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.roles from anon, authenticated;
revoke all on table public.roadmap_nodes from anon, authenticated;
revoke all on table public.checklist_items from anon, authenticated;
revoke all on table public.node_links from anon, authenticated;
revoke all on table public.job_descriptions from anon, authenticated;
revoke all on table public.job_requirements from anon, authenticated;

create policy users_deny_client on public.users
  for all to anon, authenticated
  using (false)
  with check (false);

create policy roles_deny_client on public.roles
  for all to anon, authenticated
  using (false)
  with check (false);

create policy roadmap_nodes_deny_client on public.roadmap_nodes
  for all to anon, authenticated
  using (false)
  with check (false);

create policy checklist_items_deny_client on public.checklist_items
  for all to anon, authenticated
  using (false)
  with check (false);

create policy node_links_deny_client on public.node_links
  for all to anon, authenticated
  using (false)
  with check (false);

create policy job_descriptions_deny_client on public.job_descriptions
  for all to anon, authenticated
  using (false)
  with check (false);

create policy job_requirements_deny_client on public.job_requirements
  for all to anon, authenticated
  using (false)
  with check (false);
