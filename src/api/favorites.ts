import { supabase } from './supabase'
import { withRetry } from './retry'
import { cacheGetStale, cacheSet, clearDataStale, markDataStale } from './cache'

// Версия ключа: снимок, записанный старым (до агрегации) кодом, имеет другую
// форму — его чтение даёт неверные данные. Смена значения ключа делает все
// старые записи недостижимыми без ручной чистки localStorage.
const FAVORITES_CACHE_KEY = 'favorites_overview_v2'
// Согласовано с DEFAULT_TTL (src/api/cache.ts) и частотой refetch: прежние сутки
// против staleTime в 60с означали, что перезагрузка отдавала вчерашний снимок.
const FAVORITES_CACHE_TTL = 15 * 60 * 1000

// Канал ошибок транспорта: ошибки превращались в пустой успешный результат, и
// «сломано» было неотличимо от «избранных нет» (IS-8). Ответ без ошибки, но с
// не-true значением, сюда не попадает — его ловит logFalsyWriteResult ниже.
function logQueryError(context: string, error: { message?: string } | null, cacheKey?: string): void {
  if (!error) return
  const suffix = cacheKey ? ` (cacheKey: ${cacheKey})` : ''
  console.error(`[favorites] ${context}${suffix}:`, error.message)
}

// Второй канал, отдельный от logQueryError: тот молчит на falsy error, а RPC
// способен отчитаться о неудаче прямо в теле ответа. Этот случай уходил в false
// и в 'add failed' без единой записи в консоли, а без миграции 022 повторялся
// снова и снова. Тот же приём, что у getFavoritesOverview с 015, для записи.
function logFalsyWriteResult(context: string, data: unknown): void {
  const received = JSON.stringify(data) ?? String(data)
  console.error(
    `[favorites] ${context}: RPC вернул ${received} вместо true без ошибки — ` +
      'проверьте миграцию src/sql/022_add_favorite_idempotent.sql ' +
      '(применяется вручную в Supabase SQL Editor)'
  )
}

// Сужение до JSON-объекта, а не `as`: приведение объявило бы форму заранее и
// «проверило» бы саму себя — страж формы обязан спрашивать рантайм.
function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Именно cacheGetStale, а НЕ cacheGet: у cacheGet просроченная запись
// УДАЛЯЕТСЯ на чтении. Этот снимок уходит в initialData, т.е. читается раньше
// любого запроса, и cacheGet стирал бы ровно ту копию, на которую опирается
// fallback внутри getFavoritesOverview: при сбое сервера UI рисовал бы «0
// избранных». Просроченность здесь не страшна — у запроса initialDataUpdatedAt: 0.
export function getCachedFavoritesOverview(): FavoritesOverview | null {
  return cacheGetStale<FavoritesOverview>(FAVORITES_CACHE_KEY)
}

export interface FavoriteUser {
  username: string
  userId: string
}

export interface FavoriteRow {
  matchId: string
  username: string
  userId: string
}

export interface Starlet {
  letter: string
  username: string
  userId: string
}

export interface FavoriteAgg {
  matchId: string
  count: number
  starlets: Starlet[]
}

export async function addFavorite(userId: string, matchId: string): Promise<boolean> {
  const { data, error } = await withRetry(() =>
    supabase.rpc('add_favorite', {
      p_user_id: userId,
      p_match_id: matchId,
    })
  )
  logQueryError('addFavorite', error)
  if (!error && data !== true) logFalsyWriteResult('addFavorite', data)
  return !error && data === true
}

export async function removeFavorite(userId: string, matchId: string): Promise<boolean> {
  const { data, error } = await withRetry(() =>
    supabase.rpc('remove_favorite', {
      p_user_id: userId,
      p_match_id: matchId,
    })
  )
  logQueryError('removeFavorite', error)
  if (!error && data !== true) logFalsyWriteResult('removeFavorite', data)
  return !error && data === true
}

export interface UserFavoritesResult {
  ids: string[]
  delivered: boolean
}

// delivered решает сам RPC по своему error. Выводить доставку из perf-кольца
// (hooks/useFavorites.ts) нельзя: кольцо насыщается на 60 записях (src/api/perf.ts),
// после чего не растёт и ЛЮБОЙ успешный ответ выглядит недоставленным.
export async function getUserFavorites(userId: string): Promise<UserFavoritesResult> {
  const { data, error } = await withRetry(() =>
    supabase.rpc('get_user_favorites', {
      p_user_id: userId,
    })
  )
  logQueryError('getUserFavorites', error)
  if (error) return { ids: [], delivered: false }
  return {
    ids: ((data as { match_id: string }[]) ?? []).map(d => d.match_id),
    delivered: true,
  }
}

export async function getMatchFavorites(matchId: string): Promise<FavoriteUser[]> {
  const { data, error } = await withRetry(() =>
    supabase.rpc('get_match_favorites', {
      p_match_id: matchId,
    })
  )
  logQueryError('getMatchFavorites', error)
  if (error) return []
  return ((data as { username: string; user_id: string }[]) ?? []).map(d => ({
    username: d.username,
    userId: d.user_id,
  }))
}

export async function getAllFavoritesWithUsers(): Promise<FavoriteRow[]> {
  const { data, error } = await withRetry(() =>
    supabase.rpc('get_all_favorites_with_users')
  )
  logQueryError('getAllFavoritesWithUsers', error)
  if (error) return []
  return ((data as { match_id: string; username: string; user_id: string }[]) ?? []).map(d => ({
    matchId: d.match_id,
    username: d.username,
    userId: d.user_id,
  }))
}

export async function getTotalUsersCount(): Promise<number> {
  const { data, error } = await withRetry(() => supabase.rpc('get_total_users_count'))
  logQueryError('getTotalUsersCount', error)
  if (error) return 0
  return (data as number) ?? 0
}

export interface FavoritesOverview {
  favorites: FavoriteAgg[]
  totalUsers: number
}

export async function getFavoritesOverview(): Promise<FavoritesOverview> {
  const { data, error } = await withRetry(() => supabase.rpc('get_favorites_overview'))

  if (error || !data?.length) {
    // Снимок подставляем только после того, как сбой зафиксирован в консоли:
    // иначе устаревший ответ выглядит как свежий успешный.
    logQueryError('getFavoritesOverview', error, FAVORITES_CACHE_KEY)
    // logQueryError молчит на falsy error, поэтому пустой ответ без ошибки уходил
    // в return ниже вообще без следа. Именно он выглядит как «избранных нет».
    if (!error) {
      console.error(
        `[favorites] getFavoritesOverview (cacheKey: ${FAVORITES_CACHE_KEY}): пустой ответ без ошибки — RPC вернул 0 строк (проверьте миграцию 015_optimize_favorites_overview.sql)`
      )
    }
    const stale = cacheGetStale<FavoritesOverview>(FAVORITES_CACHE_KEY)
    if (stale) {
      markDataStale(FAVORITES_CACHE_KEY)
      return stale
    }
    return { favorites: [], totalUsers: 0 }
  }

  // Сторож формы ответа — до любого приведения типов. Пока миграция
  // 015_optimize_favorites_overview.sql не применена, сервер выполняет функцию
  // из 008 и отдаёт плоские строки { match_id, username, user_id, total_users }.
  // Тогда data[0].result === undefined, и следующая строка падала бы с голым
  // TypeError на `json.favorites` — «сломано» снова неотличимо от «избранных нет».
  const row: unknown = data[0]
  const payload: unknown = isJsonRecord(row) ? row.result : undefined
  // Отсутствующий favorites — законное «избранных нет»; не-объектный result или
  // favorites не-массив — это уже другая схема, а не пустой список.
  const favoritesField: unknown = isJsonRecord(payload) ? payload.favorites : undefined
  const malformedShape =
    !isJsonRecord(payload) ||
    (favoritesField !== undefined && !Array.isArray(favoritesField))

  if (malformedShape) {
    const shape =
      'get_favorites_overview вернул не [{ result: { favorites: [...], totalUsers: N } }]. ' +
      'Почти наверняка в базе не применена миграция 015_optimize_favorites_overview.sql ' +
      '(применяется вручную в Supabase SQL Editor, файл src/sql/015_optimize_favorites_overview.sql). ' +
      `Тело ответа: ${JSON.stringify(row)?.slice(0, 200) ?? String(row)}`
    logQueryError('getFavoritesOverview: неожиданная форма ответа', { message: shape }, FAVORITES_CACHE_KEY)
    // Бросаем, а не отдаём пустой обзор: пустой здесь означал бы «схема цела,
    // избранных нет», и сбой миграции снова стал бы невидимым. Ошибка уходит в
    // React Query (retry: 1) и в консоль рядом с местом потребления.
    throw new Error(
      'Ответ get_favorites_overview имеет неожиданную форму: ожидался ' +
      "[{ result: { favorites: [...], totalUsers: N } }]. Скорее всего, в базе данных не применена " +
      'миграция 015_optimize_favorites_overview.sql — примените её вручную в Supabase SQL Editor ' +
      '(runbook: favorites-and-theme-migrations.md в корне репозитория, раздел 1; ' +
      'замена функции начинается с DROP FUNCTION). ' +
      'Пустой результат намеренно не подставляется: это сбой схемы, а не «избранных нет».'
    )
  }

  const json = (data[0] as { result: {
    favorites: { match_id: string; count: number; starlets: { username: string; userId: string }[] }[]
    totalUsers: number
  }}).result

  const result: FavoritesOverview = {
    favorites: (json.favorites ?? []).map(f => ({
      matchId: f.match_id,
      count: f.count,
      starlets: (f.starlets ?? []).map(s => ({
        letter: s.username.charAt(0).toUpperCase(),
        username: s.username,
        userId: s.userId,
      })),
    })),
    totalUsers: json.totalUsers ?? 0,
  }

  cacheSet(FAVORITES_CACHE_KEY, result, FAVORITES_CACHE_TTL)
  clearDataStale(FAVORITES_CACHE_KEY)
  return result
}
