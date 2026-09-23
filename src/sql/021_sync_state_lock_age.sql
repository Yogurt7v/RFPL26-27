-- 021_sync_state_lock_age.sql
-- get_sync_state теперь возвращает lock_started_at, чтобы фронт отличал
-- «реально идёт синк» (свежий замок) от «зависшего замка» (in_progress=true,
-- но lock_started_at старше stale-окна claim_sync = 10 минут).
-- Применять вручную в Supabase SQL Editor.

drop function if exists get_sync_state();

create function get_sync_state()
returns table (last_success_at timestamptz, in_progress boolean, lock_started_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.last_success_at, s.in_progress, s.lock_started_at
  from sync_state s
  where s.id = 1
$$;

grant execute on function get_sync_state() to anon, authenticated, service_role;