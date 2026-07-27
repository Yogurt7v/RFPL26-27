import { useState, useEffect } from 'react'

let updateSW: (() => Promise<void>) | null = null

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function register() {
      if (!('serviceWorker' in navigator)) return

      try {
        const { registerSW } = await import('virtual:pwa-register')

        updateSW = registerSW({
          onNeedRefresh() {
            if (mounted) setNeedRefresh(true)
          },
          onOfflineReady() {
            if (mounted) setOfflineReady(true)
          },
          onRegisteredSW(swUrl) {
            console.log('SW registered:', swUrl)
          },
        })
      } catch (err) {
        console.error('PWA registration failed:', err)
      }
    }

    register()

    return () => { mounted = false }
  }, [])

  const handleUpdate = async () => {
    if (updateSW) {
      await updateSW()
      window.location.reload()
    }
  }

  const dismiss = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return { needRefresh, offlineReady, update: handleUpdate, dismiss }
}
