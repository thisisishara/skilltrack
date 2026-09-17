-- Replace the env GitHub allow-list with DB-backed access:
-- one fixed admin (thisisishara) and everyone else a user who must be approved.

alter table public.users
  add column if not exists role text not null default 'user',
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_at timestamptz;

alter table public.users
  drop constraint if exists users_role_check,
  drop constraint if exists users_approval_status_check,
  drop constraint if exists users_admin_username_check;

alter table public.users
  add constraint users_role_check check (role in ('admin', 'user')),
  add constraint users_approval_status_check
    check (approval_status in ('pending', 'approved', 'denied')),
  add constraint users_admin_username_check check (
    (role = 'admin' and lower(github_username) = 'thisisishara')
    or role = 'user'
  );

create or replace function public.enforce_user_access_rules()
returns trigger
language plpgsql
as $$
begin
  if lower(new.github_username) = 'thisisishara' then
    new.role := 'admin';
    new.approval_status := 'approved';
    if new.approved_at is null then
      new.approved_at := now();
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and lower(old.github_username) = 'thisisishara' then
    new.github_username := old.github_username;
    new.role := 'admin';
    new.approval_status := 'approved';
    if new.approved_at is null then
      new.approved_at := coalesce(old.approved_at, now());
    end if;
    return new;
  end if;

  new.role := 'user';
  return new;
end;
$$;

drop trigger if exists users_enforce_access_rules on public.users;

create trigger users_enforce_access_rules
  before insert or update on public.users
  for each row execute function public.enforce_user_access_rules();

update public.users
set
  role = 'user',
  approval_status = 'pending',
  approved_at = null
where lower(github_username) not in ('thisisishara', 'dinushitj');

update public.users
set
  approval_status = 'approved',
  approved_at = coalesce(approved_at, now())
where lower(github_username) = 'dinushitj';

update public.users
set github_username = github_username
where lower(github_username) = 'thisisishara';
