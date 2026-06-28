import MatchCard from './MatchCard.jsx'
import StatusPill from './StatusPill.jsx'

export default function RoundDetail({ roundData, onBack, onMatchClick }) {
  return (
    <div>
      <div className="screen-header">
        <div className="header-with-back">
          <button className="back-btn" onClick={onBack}>‹ Rounds</button>
        </div>
        <h1>Round {roundData.round}</h1>
        <StatusPill status={roundData.status} />
      </div>
      <div className="match-list">
        {roundData.matches.map((match, i) => (
          <MatchCard
            key={i}
            match={match}
            onClick={() => onMatchClick(match, roundData.round)}
          />
        ))}
      </div>
    </div>
  )
}
