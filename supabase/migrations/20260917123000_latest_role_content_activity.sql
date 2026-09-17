-- Fast stale-roadmap checks: one grouped query instead of downloading
-- every topic, task, and link row on each dashboard render.

create or replace function public.latest_role_content_activity(p_role_ids uuid[])
returns table(role_id uuid, last_activity_at timestamptz)
language sql
stable
as $$
  with topic_times as (
    select t.role_id, max(t.updated_at) as updated_at
    from public.topics t
    where t.role_id = any(p_role_ids)
    group by t.role_id
  ),
  task_times as (
    select t.role_id, max(k.updated_at) as updated_at
    from public.tasks k
    inner join public.topics t on t.id = k.topic_id
    where t.role_id = any(p_role_ids)
    group by t.role_id
  ),
  link_times as (
    select l.role_id, max(l.updated_at) as updated_at
    from public.links l
    where l.role_id = any(p_role_ids)
    group by l.role_id
  )
  select
    ids.role_id,
    greatest(tt.updated_at, kt.updated_at, lt.updated_at) as last_activity_at
  from unnest(p_role_ids) as ids(role_id)
  left join topic_times tt on tt.role_id = ids.role_id
  left join task_times kt on kt.role_id = ids.role_id
  left join link_times lt on lt.role_id = ids.role_id
  where tt.updated_at is not null
     or kt.updated_at is not null
     or lt.updated_at is not null;
$$;

revoke all on function public.latest_role_content_activity(uuid[]) from public;
grant execute on function public.latest_role_content_activity(uuid[]) to service_role;
