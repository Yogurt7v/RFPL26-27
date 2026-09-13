-- 018_sync_state.sql
-- Состояние синхронизации и атомарный замок.
--   api/cron/sync-matches.js:  claim_sync() в начале, finish_sync() в finally
--   frontend:                  get_sync_state() для автосинка по требованию посетителей
-- Применять вручную в Supabase SQL Editor.

create table if not exists sync_state (
  id int primary key default 1 check (id = 1),
  last_sync_at timestamptz,
  last_success_at timestamptz,
  in_progress boolean not null default false,
  lock_started_at timestamptz,
  lock_id text
);

insert into sync_state (id) values (1)
on conflict (id) do nothing;

-- ── Атомарный захват замка ─────────────────────────────────────────────
-- Вызывается только из api/cron/sync-matches.js (service role).
-- Возвращает lock_id, если замок свободен или просрочен;
-- пустой результат — синхронизация уже идёт (или дошла до stale-окна).
create or replace function claim_sync(p_stale interval default interval '10 minutes')
returns table (lock_id text)
language sql
security definer
set search_path = public
as $$
  update sync_state s
  set in_progress = true,
      lock_started_at = now(),
      lock_id = md5(clock_timestamp()::text || random()::text)
  where s.id = 1
    and (
      s.in_progress = false
      or s.lock_started_at is null
      or s.lock_started_at < now() - p_stale
    )
  returning s.lock_id
$$;

-- ── Снятие замка и фиксация результата ────────────────────────────────
create or replace function finish_sync(p_lock_id text, p_success boolean)
returns boolean
language sql
security definer
set search_path = public
as $$
  update sync_state s
  set in_progress = false,
      lock_started_at = null,
      lock_id = null,
      last_sync_at = now(),
      last_success_at = case when p_success then now() else s.last_success_at end
  where s.id = 1 and s.lock_id is not distinct from p_lock_id
  returning true
$$;

-- ── Состояние для фронта ───────────────────────────────────────────────
create or replace function get_sync_state()
returns table (last_success_at timestamptz, in_progress boolean)
language sql
security definer
set search_path = public
as $$
  select s.last_success_at, s.in_progress
  from sync_state s
  where s.id = 1
$$;

-- ── Права ──────────────────────────────────────────────────────────────
-- claim_sync / finish_sync — только service role (серверная синхронизация).
-- get_sync_state доступен с фронта (anon/authenticated).
revoke execute on function claim_sync(interval) from public;
revoke execute on function finish_sync(text, boolean) from public;
revoke execute on function get_sync_state() from public;

grant execute on function claim_sync(interval) to service_role;
grant execute on function finish_sync(text, boolean) to service_role;
grant execute on function get_sync_state() to anon, authenticated, service_role;