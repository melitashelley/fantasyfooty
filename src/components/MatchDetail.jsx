import { useState } from 'react'

const POSITION_ORDER = ['Defender', 'Midfielder', 'Forward', 'Ruck']
const POSITION_LABEL = {
  Defender: 'Defenders',
  Midfielder: 'Midfielders',
  Forward: 'Forwards',
  Ruck: 'Ruck',
}

const STATS = ['K', 'H', 'M', 'G', 'HO', 'T', 'FF', 'FA']

function groupByPosition(players) {
  const groups = {}
  for (const pos of POSITION_ORDER) groups[pos] = []
  for (const p of players) {
    if (groups[p.position]) groups[p.position].push(p)
  }
  for (const pos of POSITION_ORDER) {
    groups[pos].sort((a, b) => {
      if (a.isSub !== b.isSub) return a.isSub ? 1 : -1
      return a.priority - b.priority
    })
  }
  return groups
}

function teamTotal(players) {
  return players
    .filter((p) => !p.isSub || p.subActivated)
    .reduce((sum, p) => sum + p.score, 0)
}

function hasStatBreakdown(player) {
  return player && STATS.some((s) => player[s] !== undefined && player[s] !== null)
}

function PlayerCell({ player, side }) {
  const [expanded, setExpanded] = useState(false)

  if (!player) return <div className={`player-cell player-cell--${side} player-cell--empty`} />

  const isSub = player.isSub && !player.subActivated
  const canExpand = hasStatBreakdown(player)

  const scoreEl = isSub
    ? <span className="player-score muted">{player.score > 0 ? player.score : '—'}</span>
    : <span className={`player-score ${player.score > 0 ? 'green' : 'muted'}`}>{player.score}</span>

  return (
    <div
      className={`player-cell player-cell--${side}${isSub ? ' player-cell--sub' : ''}${canExpand ? ' player-cell--tappable' : ''}`}
      style={{ flexDirection: 'column', alignItems: 'stretch' }}
      onClick={canExpand ? () => setExpanded((e) => !e) : undefined}
    >
      <div className="player-cell-main">
        <span className="player-name">{player.name}</span>
        {isSub && <span className="sub-label">Sub</span>}
        {scoreEl}
        {canExpand && <span className="expand-chevron">{expanded ? '▲' : '▼'}</span>}
      </div>
      {expanded && canExpand && (
        <div className="player-stats-bar">
          {STATS.map((s) => {
            const val = player[s] ?? 0
            return (
              <span key={s} className={`stat-chip${s === 'FA' && val > 0 ? ' negative' : ''}`}>
                {s}<strong>{val}</strong>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PositionSection({ pos, homePlayers, awayPlayers, homeTeam, awayTeam }) {
  if (homePlayers.length === 0 && awayPlayers.length === 0) return null

  const maxLen = Math.max(homePlayers.length, awayPlayers.length)
  const rows = Array.from({ length: maxLen }, (_, i) => ({
    home: homePlayers[i] || null,
    away: awayPlayers[i] || null,
  }))

  return (
    <div className="position-section">
      <div className="position-section-header dual">
        <span>{POSITION_LABEL[pos].toUpperCase()}</span>
      </div>
      <div className="dual-team-header">
        <span className="dual-team-name home">{homeTeam}</span>
        <span className="dual-team-name away">{awayTeam}</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="player-row-dual">
          <PlayerCell player={row.home} side="home" />
          <div className="dual-divider" />
          <PlayerCell player={row.away} side="away" />
        </div>
      ))}
    </div>
  )
}

export default function MatchDetail({ match, roundNum, onBack }) {
  const { home, homeScore, away, awayScore, winner, homePlayers, awayPlayers } = match

  function scoreClass(team) {
    if (homeScore === awayScore) return 'tied'
    return winner === team ? 'winner' : 'loser'
  }

  const homeGroups = groupByPosition(homePlayers)
  const awayGroups = groupByPosition(awayPlayers)
  const homeTotal = teamTotal(homePlayers)
  const awayTotal = teamTotal(awayPlayers)
  const labelText = winner ? 'Final' : 'In Progress'
  const hasStats = homePlayers.some(hasStatBreakdown) || awayPlayers.some(hasStatBreakdown)

  return (
    <div>
      <div className="match-detail-header">
        <button className="back-btn" onClick={onBack}>‹ Round {roundNum}</button>
        <div className="match-detail-teams">
          <div className="match-detail-team">
            <div className="match-detail-team-name">{home}</div>
            <div className={`match-detail-score ${scoreClass(home)}`}>{homeScore}</div>
          </div>
          <div className="match-detail-label">{labelText}</div>
          <div className="match-detail-team">
            <div className="match-detail-team-name">{away}</div>
            <div className={`match-detail-score ${scoreClass(away)}`}>{awayScore}</div>
          </div>
        </div>
        {hasStats && (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
            Tap a player to see their stat breakdown
          </p>
        )}
      </div>

      <div className="player-sections">
        {POSITION_ORDER.map((pos) => (
          <PositionSection
            key={pos}
            pos={pos}
            homePlayers={homeGroups[pos]}
            awayPlayers={awayGroups[pos]}
            homeTeam={home}
            awayTeam={away}
          />
        ))}

        <div className="dual-totals">
          <div className="dual-total home">
            <span className="total-label">{home}</span>
            <span className="total-score">{homeTotal}</span>
          </div>
          <div className="dual-total away">
            <span className="total-label">{away}</span>
            <span className="total-score">{awayTotal}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
