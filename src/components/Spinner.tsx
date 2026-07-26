interface SpinnerProps {
  className?: string
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div className={`spinner ${className || ''}`} role="status" aria-label="Загрузка...">
      <div className="spinner__bar" />
    </div>
  )
}
