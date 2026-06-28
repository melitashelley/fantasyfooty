import MatchCard from './MatchCard.jsx'
import StatusPill from './StatusPill.jsx'

export default function ThisRound({ data, onMatchClick }) {
  const currentRoundData = data.rounds.find((r) => r.round === data.currentRound)

  if (!currentRoundData) {
    return (
      <div className="screen-header">
        <h1>Round {data.currentRound}</h1>
        <p className="subtitle">No data available yet</p>
      </div>
    )
  }

  return (
    <div>
      <div className="screen-header">
        <h1>Round {data.currentRound}</h1>
        <p className="subtitle">2026 Fantasy Football</p>
        <StatusPill status={currentRoundData.status} />
      </div>
      <div className="match-list">
        {currentRoundData.matches.map((match, i) => (
          <MatchCard
            key={i}
            match={match}
            onClick={() => onMatchClick(match, data.currentRound)}
          />
        ))}
      </div>
    </div>
  )
}
