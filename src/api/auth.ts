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

export async function getSecurityQuestion(
  login: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_security_question', {
    login,
  })

  if (error || !data || data.length === 0) return null
  return data[0].question || null
}

export async function resetPasswordWithSecurity(
  login: string,
  answer: string,
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('reset_password_with_security', {
    login,
    answer: answer.toLowerCase(),
    new_password: newPassword,
  })

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: 'Неверный ответ на контрольный вопрос' }

  return { success: true, error: null }
}

export async function setSecurityQuestion(
  userId: string,
  question: string,
  answer: string
): Promise<boolean> {
  const { error } = await supabase.rpc('set_security_question', {
    user_id: userId,
    question,
    answer: answer.toLowerCase(),
  })

  return !error
}

export const SECURITY_QUESTIONS = [
  'Девичья фамилия матери',
  'Кличка домашнего питомца',
  'Любимый фильм',
  'Любимая книга',
  'Название родного города',
  'Название первой школы',
  'Любимое блюдо',
  'Марка первого автомобиля',
  'Имя любимого учителя',
  'Любимый вид спорта',
]
