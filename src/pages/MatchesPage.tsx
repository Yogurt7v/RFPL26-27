import { useNavigate } from 'react-router-dom'
import { MatchList } from '../components/MatchList'

export function MatchesPage() {
  const navigate = useNavigate()

  const handlePredict = (matchId: string) => {
    navigate(`/predict/${matchId}`)
  }

  return (
    <div className="page">
      <MatchList onPredict={handlePredict} />
    </div>
  )
}
