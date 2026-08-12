import { useRef, useState } from 'react'
import type { TeamFormMatch } from '../lib/form'
import { getTeamByName } from '../lib/teams'

interface TeamFormProps {
  teamName: string
  results: TeamFormMatch[]
}

const CLOSE_MS = 180

export function TeamForm({ teamName, results }: TeamFormProps) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggle = (idx: number) => {
    if (open && activeIdx === idx) {
      if (closeTimer.current) clearTimeout(closeTimer.current)
      setClosing(true)
      closeTimer.current = setTimeout(() => {
        setOpen(false)
        setClosing(false)
        setActiveIdx(null)
      }, CLOSE_MS)
    } else {
      if (closeTimer.current) clearTimeout(closeTimer.current)
      setClosing(false)
      setOpen(true)
      setActiveIdx(idx)
    }
  }

  const ordered = [...results].reverse()
  const teamShort = getTeamByName(teamName)?.shortName ?? teamName

  return (
    <div className="check__form">
      <div className="check__form-dots">
        {Array.from({ length: 5 }, (_, i) => {
          const match = ordered[i]
          if (!match) {
            return (
              <span key={i} className="check__form-dot check__form-dot--empty" aria-hidden="true">
                —
              </span>
            )
          }
          return (
            <button
              key={i}
              type="button"
              className={`check__form-dot check__form-dot--${match.outcome.toLowerCase()}${open && activeIdx === i ? ' check__form-dot--active' : ''}`}
              onClick={() => toggle(i)}
              aria-expanded={open}
              aria-label={`Тур ${match.round}: ${teamName} ${match.score} ${match.opponent}`}
            >
              {match.score}
            </button>
          )
        })}
      </div>

      {open && results.length > 0 && (
        <div className={`check__form-list${closing ? ' check__form-list--closing' : ''}`}>
          {ordered.map((m, i) => {
            const oppShort = getTeamByName(m.opponent)?.shortName ?? m.opponent
            return (
              <div key={i} className={`check__form-row${i === activeIdx ? ' check__form-row--active' : ''}`}>
                <span className="check__form-row-match">
                  {m.home
                    ? `${teamShort} ${m.score} ${oppShort}`
                    : `${oppShort} ${m.score} ${teamShort}`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
