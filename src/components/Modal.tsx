import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true">
        {title && (
          <div className="modal__header">
            <h3 className="modal__title">{title}</h3>
          </div>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </>
  )
}
