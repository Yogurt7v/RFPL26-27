import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MatchList } from '../components/MatchList'
import { preloadAllMatches } from '../api/matches'

export function MatchesPage() {
  const navigate = useNavigate()

  useEffect(() => {
    preloadAllMatches()
  }, [])

  const handlePredict = (matchId: string) => {
    navigate(`/predict/${matchId}`)
  }

  return (
    <div className="page">
      <MatchList onPredict={handlePredict} />
    </div>
  )
}

export default MatchesPage
