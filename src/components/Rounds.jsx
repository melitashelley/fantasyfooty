import { useState, useRef, useEffect } from 'react'

const TOTAL_ROUNDS = 23
const POSITION_ORDER = ['Defender', 'Midfielder', 'Forward', 'Ruck']
const POSITION_LABEL = { Defender: 'Defenders', Midfielder: 'Midfielders', Forward: 'Forwards', Ruck: 'Ruck' }

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

function getPillClass(roundNum, selectedRound, data) {
  if (roundNum === selectedRound) return 'round-pill selected'
  const rd = data.rounds.find((r) => r.round === roundNum)
  if (rd?.status === 'complete') return 'round-pill completed'
  if (rd?.status === 'in_progress') return 'round-pill completed'
  if (roundNum < data.currentRound) return 'round-pill completed'
  return 'round-pill future'
}

function RoundHeader({ roundNum, status }) {
  if (status === 'complete') {
    return (
      <div className="round-header">
        <h2>Round {roundNum}</h2>
        <span className="status-pill complete">Complete</span>
      </div>
    )
  }
  if (status === 'in_progress') {
    return (
      <div className="round-header">
        <h2>Round {roundNum}</h2>
        <span className="status-pill in-progress">
          <span className="status-dot" />
          In progress
        </span>
      </div>
    )
  }
  // upcoming, future, past-no-data
  return (
    <div className="round-header">
      <h2>Round {roundNum}</h2>
      <span className="status-pill upcoming">
        {status === 'past-no-data' ? 'No data' : 'Upcoming'}
      </span>
    </div>
  )
}

function MatchCard({ match, status, onClick }) {
  const { home, homeScore, away, awayScore, winner, homePlayers, awayPlayers } = match

  function scoreClass(team) {
    if (!winner || homeScore === awayScore) return 'tied'
    return winner === team ? 'winner' : 'loser'
  }

  const homeUnscored = homePlayers?.some((p) => !p.isSub && p.score === 0)
  const awayUnscored = awayPlayers?.some((p) => !p.isSub && p.score === 0)
  const allScored = !homeUnscored && !awayUnscored

  const unscored = [homeUnscored && home, awayUnscored && away].filter(Boolean)

  return (
    <div
      className="match-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="match-row">
        <span className="match-team">{home}</span>
        <div className="score-block">
          <span className={`score ${scoreClass(home)}`}>{homeScore}</span>
          <span className="score-dash">–</span>
          <span className={`score ${scoreClass(away)}`}>{awayScore}</span>
        </div>
        <span className="match-team right">{away}</span>
      </div>
      {status === 'in_progress' && (
        <div className="match-indicator">
          {allScored ? (
            <span className="all-scored-text">All players have scored</span>
          ) : (
            <>
              <span className="green-dot-sm" />
              <span>
                {unscored.join(' & ')} {unscored.length === 1 ? 'has' : 'have'} players yet to score
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function FixtureMatch({ match, homeSubmitted, awaySubmitted, isUserMatch, userTeam, userLineup, cutoffOk, onSubmitLineup, roundNum, onClick }) {
  const [lineupOpen, setLineupOpen] = useState(false)
  const userIsHome = userTeam === match.home
  const userIsAway = userTeam === match.away
  const userSubmitted = (userIsHome && homeSubmitted) || (userIsAway && awaySubmitted)
  const groups = groupByPosition(userLineup || [])

  function statusLabel(team, submitted) {
    if (team === userTeam && submitted) {
      return (
        <div className="fixture-user-actions">
          <button className="fixture-submit-link" onClick={(e) => { e.stopPropagation(); setLineupOpen(o => !o) }}>
            {lineupOpen ? 'Hide lineup' : 'View lineup'}
          </button>
          {cutoffOk && (
            <>
              <span className="fixture-action-sep">·</span>
              <button className="fixture-submit-link" onClick={(e) => { e.stopPropagation(); onSubmitLineup(roundNum) }}>
                Edit lineup
              </button>
            </>
          )}
        </div>
      )
    }
    if (team === userTeam && !submitted && cutoffOk) {
      return (
        <button className="fixture-submit-link" onClick={(e) => { e.stopPropagation(); onSubmitLineup(roundNum) }}>
          Submit lineup →
        </button>
      )
    }
    if (submitted) return <span className="fixture-submitted">✓ Submitted</span>
    return <span className="fixture-not-submitted">Not submitted</span>
  }

  return (
    <div className="fixture-card">
      <div
        className={`fixture-match${isUserMatch ? ' fixture-match--clickable' : ''}`}
        onClick={isUserMatch ? onClick : undefined}
        role={isUserMatch ? 'button' : undefined}
        tabIndex={isUserMatch ? 0 : undefined}
        onKeyDown={isUserMatch ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      >
        <div className="fixture-match-side">
          <span className="fixture-team">{match.home}</span>
          {statusLabel(match.home, homeSubmitted)}
        </div>
        <span className="fixture-v">v</span>
        <div className="fixture-match-side right">
          <span className="fixture-team">{match.away}</span>
          {statusLabel(match.away, awaySubmitted)}
        </div>
      </div>
      {lineupOpen && userSubmitted && (
        <div className="fixture-lineup-expanded">
          {POSITION_ORDER.map(pos => {
            const posPlayers = groups[pos]
            if (!posPlayers?.length) return null
            return (
              <div key={pos}>
                <div className="fixture-lineup-pos-header">{POSITION_LABEL[pos]}</div>
                {posPlayers.map(p => (
                  <div key={p.name} className={`fixture-lineup-player${p.isSub ? ' is-sub' : ''}`}>
                    <span>{p.name}</span>
                    {p.isSub && p.priority != null && <span className="fixture-lineup-sub-tag">Sub {p.priority}</span>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Rounds({ data, onMatchClick, onUpcomingMatchClick, onSubmitLineup }) {
  const [selectedRound, setSelectedRound] = useState(data.currentRound)
  const stripRef = useRef(null)

  // Recall team code from session (set after successful submission)
  const storedCode = typeof localStorage !== 'undefined' ? localStorage.getItem('ff_team_code') : null
  const storedTeam = storedCode ? data.teamCodes?.[storedCode] : null

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const pill = strip.querySelector(`[data-round="${data.currentRound}"]`)
    if (pill) {
      strip.scrollLeft = pill.offsetLeft - strip.offsetWidth / 2 + pill.offsetWidth / 2
    }
  }, [data.currentRound])

  const roundData = data.rounds.find((r) => r.round === selectedRound)
  const fixtureMatches = data.fixture?.find((f) => f.round === selectedRound)?.matches || []

  function getStatus() {
    if (roundData) return roundData.status
    if (selectedRound < data.currentRound) return 'past-no-data'
    return 'future'
  }

  const status = getStatus()
  const hasMatchData = status === 'complete' || status === 'in_progress'
  const selectedCutoff = roundData?.cutoff
  const cutoffOk = selectedCutoff ? new Date(selectedCutoff) > new Date() : true

  return (
    <div className="rounds-screen">
      <div className="screen-header">
        <h1>Rounds</h1>
        <p className="subtitle">Deloitte Tax Fantasy AFL 2026</p>
      </div>
      <div className="round-pill-strip" ref={stripRef}>
        {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            data-round={n}
            className={getPillClass(n, selectedRound, data)}
            onClick={() => setSelectedRound(n)}
          >
            R{n}
          </button>
        ))}
      </div>

      <div className="round-content">
        <RoundHeader roundNum={selectedRound} status={status} />

        {hasMatchData ? (
          <div className="match-list">
            {roundData.matches.map((m, i) => (
              <MatchCard
                key={i}
                match={m}
                status={status}
                onClick={() => onMatchClick(m, selectedRound)}
              />
            ))}
          </div>
        ) : (
          <div className="match-list">
            {fixtureMatches.length > 0 ? (
              fixtureMatches.map((m, i) => {
                const homeSubmitted = !!(data.submittedLineups?.[selectedRound]?.[m.home]?.length)
                const awaySubmitted = !!(data.submittedLineups?.[selectedRound]?.[m.away]?.length)
                const isUserMatch = storedTeam === m.home || storedTeam === m.away
                const userLineup = storedTeam ? (data.submittedLineups?.[selectedRound]?.[storedTeam] || []) : []
                return (
                  <FixtureMatch
                    key={i}
                    match={m}
                    homeSubmitted={homeSubmitted}
                    awaySubmitted={awaySubmitted}
                    isUserMatch={isUserMatch}
                    userTeam={storedTeam}
                    userLineup={userLineup}
                    cutoffOk={cutoffOk}
                    onSubmitLineup={onSubmitLineup}
                    roundNum={selectedRound}
                    onClick={() => onUpcomingMatchClick?.(m, selectedRound)}
                  />
                )
              })
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px 0' }}>
                No fixture data available.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
