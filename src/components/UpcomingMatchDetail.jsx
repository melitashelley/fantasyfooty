const POSITION_ORDER = ['Defender', 'Midfielder', 'Forward', 'Ruck']
const POSITION_LABEL = {
  Defender: 'Defenders',
  Midfielder: 'Midfielders',
  Forward: 'Forwards',
  Ruck: 'Ruck',
}

function groupByPosition(players) {
  const groups = {}
  for (const pos of POSITION_ORDER) groups[pos] = []
  for (const p of players || []) {
    if (groups[p.position]) groups[p.position].push(p)
  }
  for (const pos of POSITION_ORDER) {
    groups[pos].sort((a, b) => {
      if (a.isSub !== b.isSub) return a.isSub ? 1 : -1
      if (!a.isSub) return a.name.localeCompare(b.name)
      return (a.priority || 0) - (b.priority || 0)
    })
  }
  return groups
}

function PlayerRow({ player }) {
  const isSub = player.isSub
  return (
    <div className={`player-order-row ${isSub ? 'is-sub' : 'is-starter'}`}>
      <span className="player-name">{player.name}</span>
      {isSub && player.priority != null && (
        <span className="player-role-tag">Sub {player.priority}</span>
      )}
    </div>
  )
}

function PositionGroup({ pos, players }) {
  if (!players?.length) return null
  return (
    <div className="roster-position-group">
      <div className="roster-position-header">
        <span className="pos-label">{POSITION_LABEL[pos].toUpperCase()}</span>
      </div>
      {players.map((p) => (
        <PlayerRow key={p.name} player={p} />
      ))}
    </div>
  )
}

export default function UpcomingMatchDetail({ match, roundNum, data, onBack, onSubmitLineup }) {
  const { home, away } = match

  const storedCode = (typeof localStorage !== 'undefined' ? localStorage.getItem('ff_team_code') : null)?.toUpperCase() || null
  const storedTeam = storedCode ? data.teamCodes?.[storedCode] : null

  const roundInfo = data.rounds?.find((r) => r.round === roundNum)
  const cutoff = roundInfo?.cutoff
  const cutoffOk = cutoff ? new Date(cutoff) > new Date() : true
  const cutoffLabel = cutoff
    ? new Date(cutoff).toLocaleDateString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : null

  const thisRound = data.submittedLineups?.[roundNum] || {}

  const userTeam = storedTeam === home ? home : storedTeam === away ? away : null
  const opponentTeam = userTeam === home ? away : userTeam === away ? home : null
  const userInMatch = !!userTeam

  const userSubmittedPlayers = userTeam ? (thisRound[userTeam] || []) : []
  const userSubmitted = userSubmittedPlayers.length > 0
  const opponentSubmitted = opponentTeam ? !!(thisRound[opponentTeam]?.length) : false

  const userGroups = groupByPosition(userSubmittedPlayers)

  return (
    <div>
      <div className="match-detail-header">
        <button className="back-btn" onClick={onBack}>‹ Round {roundNum}</button>
        <div className="match-detail-teams">
          <div className="match-detail-team">
            <div className="match-detail-team-name">{home}</div>
            <div className="match-detail-score muted">—</div>
          </div>
          <div className="match-detail-label">Upcoming</div>
          <div className="match-detail-team">
            <div className="match-detail-team-name">{away}</div>
            <div className="match-detail-score muted">—</div>
          </div>
        </div>
      </div>

      {/* User is in this match and has submitted */}
      {userInMatch && userSubmitted && (
        <>
          <div className="submitted-banner">
            <span className="submitted-tick">✓</span> Lineup locked in
            {cutoffLabel && <span className="submitted-countdown"> · Closes {cutoffLabel}</span>}
          </div>
          <div className="upcoming-team-label">{userTeam}</div>
          <div className="roster-scroll" style={{ paddingBottom: cutoffOk ? '80px' : '16px' }}>
            {POSITION_ORDER.map((pos) => (
              <PositionGroup key={pos} pos={pos} players={userGroups[pos]} />
            ))}
          </div>
          {opponentTeam && (
            <div className="opponent-status">
              <span className="opponent-name">{opponentTeam}</span>
              {opponentSubmitted
                ? <span className="opponent-submitted">✓ Submitted</span>
                : <span className="opponent-pending">Not yet submitted</span>}
            </div>
          )}
        </>
      )}

      {/* User is in this match but hasn't submitted */}
      {userInMatch && !userSubmitted && (
        <div style={{ padding: '24px 16px', paddingBottom: cutoffOk ? '80px' : '24px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            You haven't submitted your lineup yet.
            {cutoffLabel && ` Closes ${cutoffLabel}.`}
          </p>
          {opponentTeam && (
            <div className="opponent-status">
              <span className="opponent-name">{opponentTeam}</span>
              {opponentSubmitted
                ? <span className="opponent-submitted">✓ Submitted</span>
                : <span className="opponent-pending">Not yet submitted</span>}
            </div>
          )}
        </div>
      )}

      {/* User is not in this match */}
      {!userInMatch && (
        <div style={{ padding: '16px' }}>
          <div className="opponent-status">
            <span className="opponent-name">{home}</span>
            {thisRound[home]?.length
              ? <span className="opponent-submitted">✓ Submitted</span>
              : <span className="opponent-pending">Not yet submitted</span>}
          </div>
          <div className="opponent-status">
            <span className="opponent-name">{away}</span>
            {thisRound[away]?.length
              ? <span className="opponent-submitted">✓ Submitted</span>
              : <span className="opponent-pending">Not yet submitted</span>}
          </div>
        </div>
      )}

      {userInMatch && cutoffOk && (
        <div className="submit-footer">
          <button className="btn-primary btn-submit" onClick={() => onSubmitLineup(roundNum)}>
            {userSubmitted ? 'Edit Lineup' : 'Submit Lineup →'}
          </button>
        </div>
      )}
    </div>
  )
}
