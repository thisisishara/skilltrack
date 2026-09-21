-- Rename Track copilot columns and catalog to Tracky. Data is unchanged.

alter table public.user_settings rename column track_enabled to tracky_enabled;
alter table public.user_settings rename column track_provider to tracky_provider;
alter table public.user_settings rename column track_model to tracky_model;
alter table public.user_settings rename column track_base_url to tracky_base_url;
alter table public.user_settings rename column track_api_key_ciphertext to tracky_api_key_ciphertext;
alter table public.user_settings rename column track_api_key_iv to tracky_api_key_iv;
alter table public.user_settings rename column track_api_key_last4 to tracky_api_key_last4;
alter table public.user_settings rename column track_config to tracky_config;

alter table public.user_settings rename constraint user_settings_provider_check to user_settings_tracky_provider_check;

alter table public.track_model_catalog rename to tracky_model_catalog;
alter table public.tracky_model_catalog rename constraint track_model_catalog_provider_check to tracky_model_catalog_provider_check;
alter table public.tracky_model_catalog rename constraint track_model_catalog_model_id_not_blank to tracky_model_catalog_model_id_not_blank;
alter table public.tracky_model_catalog rename constraint track_model_catalog_pkey to tracky_model_catalog_pkey;

alter policy track_model_catalog_deny_client on public.tracky_model_catalog rename to tracky_model_catalog_deny_client;
