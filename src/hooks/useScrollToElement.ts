import { useEffect } from 'react'

interface UseScrollToElementOptions {
  delay?: number
  block?: 'start' | 'center' | 'end' | 'nearest'
  behavior?: 'smooth' | 'instant'
}

export function useScrollToElement(
  elementId: string | null | undefined,
  options: UseScrollToElementOptions = {}
) {
  const { delay = 100, block = 'center', behavior = 'smooth' } = options

  useEffect(() => {
    if (!elementId) return

    const timer = setTimeout(() => {
      const el = document.getElementById(elementId)
      if (el) {
        el.scrollIntoView({ behavior, block })
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [elementId, delay, block, behavior])
}
