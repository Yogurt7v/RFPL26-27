import { supabase } from './supabase'

export interface AuthUser {
  id: string
  username: string
  createdAt: string
}

export async function registerUser(
  login: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data, error } = await supabase.rpc('register_user', {
    login,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  if (!data) {
    return { user: null, error: 'Не удалось создать пользователя' }
  }

  return {
    user: {
      id: data,
      username: login,
      createdAt: new Date().toISOString(),
    },
    error: null,
  }
}

export async function verifyUser(
  login: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data, error } = await supabase.rpc('verify_user', {
    login,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  if (!data || data.length === 0) {
    return { user: null, error: 'Неверный логин или пароль' }
  }

  const userData = data[0]

  return {
    user: {
      id: userData.id,
      username: userData.username,
      createdAt: userData.created_at,
    },
    error: null,
  }
}
