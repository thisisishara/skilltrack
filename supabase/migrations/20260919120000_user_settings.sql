-- Account-level preferences: notifications and BYOK Track copilot secrets.
-- Service-role only, matching the rest of the schema (fail-closed RLS).

create table public.user_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  notifications_enabled boolean not null default true,
  track_enabled boolean not null default false,
  track_provider text,
  track_model text,
  track_base_url text,
  track_api_key_ciphertext text,
  track_api_key_iv text,
  track_api_key_last4 text,
  track_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_provider_check check (
    track_provider is null
    or track_provider in ('anthropic', 'openai', 'google', 'openrouter')
  )
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

revoke all on table public.user_settings from anon, authenticated;

create policy user_settings_deny_client on public.user_settings
  for all to anon, authenticated
  using (false)
  with check (false);
