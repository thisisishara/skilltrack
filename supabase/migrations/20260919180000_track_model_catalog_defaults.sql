-- Grant the service role explicit access, reload PostgREST, and seed current
-- high- and low-cost Track models. Admins can add or remove any of these.

grant select, insert, update, delete on table public.track_model_catalog to postgres, service_role;

notify pgrst, 'reload schema';

insert into public.track_model_catalog (provider, model_id) values
  ('anthropic', 'claude-fable-5-1'),
  ('anthropic', 'claude-opus-5'),
  ('anthropic', 'claude-sonnet-5'),
  ('anthropic', 'claude-haiku-4-5'),
  ('openai', 'gpt-6-astra'),
  ('openai', 'gpt-5.6-sol'),
  ('openai', 'gpt-5.6-terra'),
  ('openai', 'gpt-5.6-luna'),
  ('google', 'gemini-3.1-pro-preview'),
  ('google', 'gemini-3.8-flash'),
  ('google', 'gemini-3.5-flash'),
  ('google', 'gemini-3.5-flash-lite'),
  ('openrouter', 'openai/gpt-6-astra'),
  ('openrouter', 'openai/gpt-5.6-sol'),
  ('openrouter', 'openai/gpt-5.6-luna'),
  ('openrouter', 'anthropic/claude-opus-5'),
  ('openrouter', 'anthropic/claude-sonnet-5'),
  ('openrouter', 'google/gemini-3.8-flash'),
  ('openrouter', 'deepseek/deepseek-v4-flash'),
  ('openrouter', 'x-ai/grok-4.6')
on conflict (provider, model_id) do nothing;
