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
      return (a.priority || 0) - (b.priority || 0)
    })
  }
  return groups
}

function PlayerRow({ player, greyed }) {
  const isSub = player.isSub
  return (
    <div className={`player-order-row ${isSub ? 'is-sub' : 'is-starter'}${greyed ? ' is-greyed' : ''}`}>
      <span className={`priority-badge ${isSub ? 'badge-sub' : 'badge-starter'}`}>
        {player.priority}
      </span>
      <span className="player-name">{player.name}</span>
      {isSub && <span className="player-role-tag">Sub</span>}
      <span className="player-score muted" style={{ marginLeft: 'auto' }}>—</span>
    </div>
  )
}

function PositionGroup({ pos, players, greyed }) {
  if (!players.length) return null
  return (
    <div className="roster-position-group">
      <div className="roster-position-header">
        <span className="pos-label">{POSITION_LABEL[pos].toUpperCase()}</span>
      </div>
      {players.map((p) => (
        <PlayerRow key={p.name} player={p} greyed={greyed} />
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
  const lastRound = data.submittedLineups?.[roundNum - 1] || {}

  const userTeam = storedTeam === home ? home : storedTeam === away ? away : null
  const opponentTeam = userTeam === home ? away : userTeam === away ? home : null

  // Get user's lineup: this round's submission or last round's fallback
  const userThisRound = userTeam ? thisRound[userTeam] : null
  const userLastRound = userTeam ? lastRound[userTeam] : null
  const userSubmitted = !!(userThisRound?.length)
  const userPlayers = userThisRound?.length ? userThisRound : userLastRound || []
  const showingLastWeek = userTeam && !userSubmitted && userPlayers.length > 0

  console.log('[UpcomingMatchDetail]', {
    storedCode,
    storedTeam,
    userTeam,
    userPlayers,
    thisRoundKeys: Object.keys(thisRound),
    submittedLineupForTeam: userTeam ? thisRound[userTeam] : undefined,
  })

  const userGroups = groupByPosition(userPlayers)

  // Opponent — only show submitted status, not their lineup
  const opponentSubmitted = opponentTeam ? !!(thisRound[opponentTeam]?.length) : false

  const userInMatch = !!userTeam

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

      {/* User's team section */}
      {userInMatch && (
        <>
          {userSubmitted && (
            <div className="submitted-banner">
              <span className="submitted-tick">✓</span> Lineup locked in
              {cutoffLabel && <span className="submitted-countdown"> · Closes {cutoffLabel}</span>}
            </div>
          )}
          {showingLastWeek && (
            <div className="last-week-notice">
              Showing last week's team{cutoffLabel ? ` · Closes ${cutoffLabel}` : ''}
            </div>
          )}
          {!userSubmitted && !showingLastWeek && (
            <div className="last-week-notice">
              No lineup submitted{cutoffLabel ? ` · Closes ${cutoffLabel}` : ''}
            </div>
          )}

          <div className="upcoming-team-label">{userTeam}</div>
          <div className="roster-scroll" style={{ paddingBottom: userInMatch && cutoffOk ? '80px' : '16px' }}>
            {userPlayers.length > 0 ? (
              POSITION_ORDER.map((pos) => (
                <PositionGroup
                  key={pos}
                  pos={pos}
                  players={userGroups[pos]}
                  greyed={showingLastWeek}
                />
              ))
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '8px 16px' }}>
                No lineup data available yet.
              </p>
            )}
          </div>

          {/* Opponent submitted status */}
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

      {/* Not in this match — show both submitted statuses */}
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
