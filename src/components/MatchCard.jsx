export default function MatchCard({ match, onClick }) {
  const { home, homeScore, away, awayScore, winner, homePlayers, awayPlayers } = match

  function scoreClass(team) {
    if (homeScore === awayScore) return 'tied'
    return winner === team ? 'winner' : 'loser'
  }

  function hasUnscored(players) {
    return players.some((p) => !p.isSub && p.score === 0)
  }

  const homeUnscored = hasUnscored(homePlayers)
  const awayUnscored = hasUnscored(awayPlayers)
  const allScored = !homeUnscored && !awayUnscored

  function statusLine() {
    if (allScored) {
      return <span>All players have scored</span>
    }
    const parts = []
    if (homeUnscored) parts.push(home)
    if (awayUnscored) parts.push(away)
    return (
      <span className="not-scored">
        <span className="status-dot-sm" />
        {parts.join(' & ')} {parts.length === 1 ? 'has' : 'have'} players yet to score
      </span>
    )
  }

  return (
    <div className="match-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="match-card-scores">
        <span className="match-team">{home}</span>
        <div className="match-score-block">
          <span className={`match-score ${scoreClass(home)}`}>{homeScore}</span>
          <span className="match-dash">–</span>
          <span className={`match-score ${scoreClass(away)}`}>{awayScore}</span>
        </div>
        <span className="match-team away">{away}</span>
      </div>
      <div className="match-card-status">
        {statusLine()}
      </div>
    </div>
  )
}
