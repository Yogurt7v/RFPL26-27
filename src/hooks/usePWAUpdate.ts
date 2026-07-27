import { useState, useEffect, useCallback } from 'react'

let updateSWFn: (() => Promise<void>) | null = null

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function register() {
      if (!('serviceWorker' in navigator)) return

      try {
        const { registerSW } = await import('virtual:pwa-register')

        updateSWFn = registerSW({
          onNeedRefresh() {
            if (mounted) setNeedRefresh(true)
          },
          onOfflineReady() {
            if (mounted) setOfflineReady(true)
          },
          onRegisteredSW(swUrl, registration) {
            console.log('SW registered:', swUrl)
            if (registration?.waiting && mounted) {
              setNeedRefresh(true)
            }
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

    return () => { mounted = false }
  }, [])

  const update = useCallback(async () => {
    if (updateSWFn) {
      await updateSWFn()
      window.location.reload()
    }
  }, [])

  const dismiss = useCallback(() => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }, [])

  return { needRefresh, offlineReady, update, dismiss }
}
