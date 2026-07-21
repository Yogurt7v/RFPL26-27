import { supabase } from './supabase'

async function testConnection() {
  console.log('Тест подключения к Supabase...')

  const { data, error } = await supabase.from('users').select('*').limit(1)

  if (error) {
    console.error('Ошибка подключения:', error.message)
    console.error('Код ошибки:', error.code)
  }

  console.log('Подключение успешно!')
  console.log('Данные из таблицы users:', data)
}

testConnection()
