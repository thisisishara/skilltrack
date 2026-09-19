-- App-wide Track model ids that admins can add beyond the built-in list.
-- Service-role only, matching the rest of the schema (fail-closed RLS).

create table public.track_model_catalog (
  provider text not null,
  model_id text not null,
  created_at timestamptz not null default now(),
  primary key (provider, model_id),
  constraint track_model_catalog_provider_check check (
    provider in ('anthropic', 'openai', 'google', 'openrouter')
  ),
  constraint track_model_catalog_model_id_not_blank check (btrim(model_id) <> '')
);

alter table public.track_model_catalog enable row level security;

revoke all on table public.track_model_catalog from anon, authenticated;

create policy track_model_catalog_deny_client on public.track_model_catalog
  for all to anon, authenticated
  using (false)
  with check (false);
