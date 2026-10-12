import { useState, useEffect, useCallback } from 'react'

// registerType в vite.config.ts остаётся 'prompt', и это осознанный выбор.
//
// Почему НЕ 'autoUpdate': он снимает ожидание и переключает активный service
// worker без спроса, в произвольный момент — хоть посреди заполненной формы
// прогноза. Пользователь теряет несохранённый ввод (счёт при смене расклада или
// тотал-баллы), а это ровно то действие, ради которого он открыл приложение.
// Поэтому обновление применяется только по нажатию «Обновить».
//
// Почему 'prompt' тоже недостаточно: registerSW() из virtual:pwa-register лишь
// подписывается на событие 'waiting' и никогда сам не просит браузер заново
// скачать sw.js. Браузер проверяет его по своему расписанию — при заходе на
// страницу и не чаще раза в сутки (Chrome: 24 часа с последней проверки).
// Новый деплой может лежать на сервере сутки, никто об этом не узнает, и
// onNeedRefresh просто не с чем будет сработать. Отсюда все принудительные
// вызовы registration.update() ниже — они возвращают надёжность, не отдавая
// пользователю контроль.

// Функция «активировать и перезагрузить», которую вернул virtual:pwa-register.
// Внутри она вызывает skipWaiting для висящего service worker — это единственный
// способ реально подменить SW на новый, пока он сам не согласится.
let updateSWFn: (() => Promise<void>) | null = null

// Регистрация нужна нам только ради registration.update() — доступа к ней
// больше ни у кого нет, поэтому она и была потеряна в исходной версии файла.
let swRegistration: ServiceWorkerRegistration | null = null

// Есть ли уже заведомо новая версия, висящая в ожидании.
// Хранится на уровне модуля намеренно, а не в useState/useRef:
//   1) экспортированная checkForUpdate() живёт вне React и не видит ref хука;
//   2) useState перерисовал бы баннер и пересоздал бы интервал проверки;
//   3) значение переживает StrictMode-перемонтирование эффекта.
// По смыслу это аналог useRef — мутабельно и не вызывает ререндер.
let hasWaitingUpdate = false

// Периодическая проверка обновлений. 15 минут — достаточно часто, чтобы баннер
// появился в пределах одной сессии, и достаточно редко, чтобы не жечь трафик:
// ответ отдаётся из HTTP-кеша и почти всегда 304.
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000

// Одна попытка спросить сервер, не изменился ли sw.js.
async function requestUpdate(): Promise<void> {
  const registration = swRegistration
  // Регистрации ещё нет (первый запуск, браузер без SW, регистрация не успела
  // завершиться) — это тихий выход, а не ошибка: вызывающий код ждёт void.
  if (!registration) return

  try {
    await registration.update()
  } catch (err) {
    // Оффлайн, обрыв сети, потерянный снапшот — неудачная проверка обновлений
    // не должна ни бросать исключение, ни ломать работу приложения.
    console.warn('Не удалось проверить обновление SW:', err)
  }
}

// Автоматическая проверка: при монтировании, по таймеру и при возврате на вкладку.
async function autoCheckForUpdate(): Promise<void> {
  // Новая версия уже скачана и ждёт. Повторный update() ничего нового не даст,
  // но сетевой запрос съест — поэтому заранее выходим.
  if (hasWaitingUpdate) return
  await requestUpdate()
}

// Ручная проверка по кнопке «Проверить обновления».
// Здесь отсечка по hasWaitingUpdate намеренно не стоит: человек нажал кнопку
// осознанно, и это единственный способ узнать ответ прямо сейчас.
export async function checkForUpdate(): Promise<void> {
  await requestUpdate()
}

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    // Флаг живого эффекта. В StrictMode эффект монтируется, размонтируется и
    // снова монтируется, а внутри стоит асинхронный import('virtual:pwa-register').
    // Поэтому onRegisteredSW вполне может прийти уже ПОСЛЕ cleanup.
    let active = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const startPolling = () => {
      // Проверка active — главная защита от утечки таймера: cleanup к этому
      // моменту уже прошёл и stopPolling снял несуществующий ещё интервал,
      // так что таймер, стартовавший после размонтирования, остался бы жить
      // навсегда. Второе условие защищает от двойного старта.
      if (!active || intervalId !== null) return
      intervalId = setInterval(() => {
        void autoCheckForUpdate()
      }, UPDATE_CHECK_INTERVAL_MS)
    }

    async function register() {
      if (!('serviceWorker' in navigator)) return

      try {
        const { registerSW } = await import('virtual:pwa-register')

        // Пока грузился модуль, эффект мог размонтироваться. Дальше идти
        // незачем: следующий mount вызовет register() заново, а этот экземпляр
        // уже не сможет ни показать баннер, ни запустить интервал.
        if (!active) return

        updateSWFn = registerSW({
          onNeedRefresh() {
            hasWaitingUpdate = true
            if (active) setNeedRefresh(true)
          },
          onOfflineReady() {
            if (active) setOfflineReady(true)
          },
          onRegisteredSW(swUrl, registration) {
            console.log('SW registered:', swUrl)

            // Тип объявляет `| undefined`: если регистрация не удалась, обновлять
            // нечем, и любое обращение к registration уронило бы приложение.
            if (!registration) return
            swRegistration = registration

            // Новая версия могла прийти ещё до первой проверки — сразу баннер.
            if (registration.waiting) {
              hasWaitingUpdate = true
              if (active) setNeedRefresh(true)
            }

            // Первая проверка сразу после регистрации. Нужна, потому что браузер
            // к этому моменту мог ещё не успеть проверить sw.js сам, а реестр
            // вкладок на мобильных обновляется в фоне крайне лениво.
            void autoCheckForUpdate()

            // Таймер стартует только здесь: до этого момента registration
            // не существует, а update() у него всё равно нечего спрашивать.
            startPolling()
          },
          onRegisterError(error) {
            console.error('SW registration error:', error)
          },
        })
      } catch (err) {
        console.error('PWA registration failed:', err)
      }
    }

    register()

    // Возврат на вкладку — самый частый сценарий для PWA: человек сворачивает
    // приложение на паузу и возвращается через час. Проверка здесь срабатывает
    // почти мгновенно, а таймер ждал бы ещё до 15 минут.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void autoCheckForUpdate()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      stopPolling()
      // Ссылка обязана быть той же самой, что при addEventListener. Если бы мы
      // передали другой отпечаток (например, новую стрелку), removeEventListener
      // не нашёл бы подписку и она пережила бы размонтирование навсегда.
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Нажатие «Обновить»: updateSWFn() вызывает skipWaiting для висящего SW,
  // но подменённые им ассеты отдаются только после перезагрузки страницы,
  // поэтому reload() обязателен — иначе юзер останется на старой версии UI.
  const update = useCallback(async () => {
    if (updateSWFn) {
      await updateSWFn()
      window.location.reload()
    }
  }, [])

  // Скрытие баннера не отменяет обновление: висящий SW так и остаётся висящим.
  // hasWaitingUpdate намеренно НЕ сбрасываем — иначе таймер опять начнёт
  // бессмысленно дёргать сеть ради уже известного ответа.
  const dismiss = useCallback(() => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }, [])

  return { needRefresh, offlineReady, update, dismiss }
}
