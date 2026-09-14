-- Role names are unique per user as stored (trimmed). Case differences are
-- distinct names, so "Engineer" and "engineer" may both exist.

alter table public.roles
  drop constraint roles_user_normalized_name_key;

alter table public.roles
  drop column normalized_name;

alter table public.roles
  add constraint roles_user_name_key unique (user_id, name);
