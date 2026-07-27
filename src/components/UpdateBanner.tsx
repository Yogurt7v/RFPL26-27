import { usePWAUpdate } from '../hooks/usePWAUpdate'

export function UpdateBanner() {
  const { needRefresh, update, dismiss } = usePWAUpdate()

  if (!needRefresh) return null

  return (
    <div className="update-banner">
      <div className="update-banner__text">
        Доступна новая версия приложения
      </div>
      <div className="update-banner__actions">
        <button type="button" className="update-banner__btn update-banner__btn--update" onClick={update}>
          Обновить
        </button>
        {/*<button type="button" className="update-banner__btn update-banner__btn--dismiss" onClick={dismiss}>
          Позже
        </button>*/}
      </div>
    </div>
  )
}
