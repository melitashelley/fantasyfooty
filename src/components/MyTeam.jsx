import { useState } from 'react'
import { getHeadshotUrl } from '../data/playerIds.js'
import { getTeamLogoUrl } from '../data/teamLogos.js'

const POSITION_ORDER = ['Defender', 'Midfielder', 'Forward', 'Ruck']
const POSITION_LABEL = {
  Defender: 'Defenders',
  Midfielder: 'Midfielders',
  Forward: 'Forwards',
  Ruck: 'Ruck',
}

function PlayerPhoto({ name }) {
  const [imgError, setImgError] = useState(false)
  const url = getHeadshotUrl(name)

  if (!url || imgError) {
    return (
      <div className="myteam-photo myteam-photo--placeholder">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </div>
    )
  }

  return (
    <img
      className="myteam-photo"
      src={url}
      alt={name}
      onError={() => setImgError(true)}
    />
  )
}

function ClubLogo({ aflTeam }) {
  const [imgError, setImgError] = useState(false)
  const url = getTeamLogoUrl(aflTeam)

  if (!url || imgError) {
    return <span className="myteam-club-text">{aflTeam}</span>
  }

  return (
    <img
      className="myteam-club-logo"
      src={url}
      alt={aflTeam}
      onError={() => setImgError(true)}
    />
  )
}

function PlayerRow({ player, seasonTotal, earnedTotal, matches }) {
  return (
    <div className="myteam-player-row">
      <PlayerPhoto name={player.name} />
      <div className="myteam-player-info">
        <span className="myteam-player-name">{player.name}</span>
        <ClubLogo aflTeam={player.afl_team} />
        <span className="myteam-club-text">{player.afl_team}</span>
      </div>
      <div className="myteam-player-pts">
        <div className="myteam-pts-block">
          <span className="myteam-pts-value">{seasonTotal ?? '—'}</span>
          <span className="myteam-pts-label">total</span>
        </div>
        <div className="myteam-pts-block">
          <span className="myteam-pts-value">{earnedTotal ?? '—'}</span>
          <span className="myteam-pts-label">earned</span>
        </div>
        <div className="myteam-pts-block">
          <span className="myteam-pts-value">{matches ?? '—'}</span>
          <span className="myteam-pts-label">matches</span>
        </div>
      </div>
    </div>
  )
}

export default function MyTeam({ data, onNextMatchClick, onChangeTeam }) {
  const storedCode = typeof localStorage !== 'undefined' ? localStorage.getItem('ff_team_code') : null
  const storedTeam = storedCode ? data.teamCodes?.[storedCode] : null

  if (!storedTeam) {
    return (
      <div className="myteam-screen">
        <div className="screen-header">
          <h1>My Team</h1>
          <p className="subtitle">Deloitte Tax Fantasy AFL 2026</p>
        </div>
        <p style={{ padding: '24px 16px', color: 'var(--text-secondary)', fontSize: 14 }}>
          No team found. Please set up your team code.
        </p>
      </div>
    )
  }

  // Ladder position from current round
  const currentRoundData = data.rounds?.find(r => r.round === data.currentRound)
  const ladderEntry = currentRoundData?.ladder?.find(l => l.team === storedTeam)
  const position = ladderEntry?.rank
  const totalFor = ladderEntry?.for ?? 0

  // Next upcoming match
  const nextRoundEntry = data.rounds?.find(r => r.status === 'upcoming' || r.status === 'future')
  const nextFixture = data.fixture?.find(f => f.round === nextRoundEntry?.round)
  const nextMatch = nextFixture?.matches?.find(m => m.home === storedTeam || m.away === storedTeam)
  const nextRound = nextRoundEntry?.round
  const nextCutoff = nextRoundEntry?.cutoff

  const thisRoundLineups = data.submittedLineups?.[nextRound] || {}
  const nextSubmitted = !!(thisRoundLineups[storedTeam]?.length)

  // Roster — sorted by submitted lineup order for next round, else roster order
  const roster = data.rosters?.[storedTeam] || []
  const submittedLineup = nextRound ? (data.submittedLineups?.[nextRound]?.[storedTeam] || data.submittedLineups?.[nextRound - 1]?.[storedTeam]) : null

  function buildDisplayRoster() {
    if (submittedLineup?.length) {
      const nameToRoster = Object.fromEntries(roster.map(p => [p.name, p]))
      return submittedLineup.map(lp => ({
        ...nameToRoster[lp.name],
        name: lp.name,
        priority: lp.priority,
        isSub: lp.isSub,
        position: lp.position,
      })).filter(p => p.name)
    }
    // No lineup submitted — show roster in default order
    return roster.map((p, i) => ({ ...p, priority: i + 1, isSub: false }))
  }

  const displayRoster = buildDisplayRoster()
  displayRoster.sort((a, b) => {
    const pi = POSITION_ORDER.indexOf(a.position)
    const qi = POSITION_ORDER.indexOf(b.position)
    if (pi !== qi) return pi - qi
    return a.name.localeCompare(b.name)
  })

  const playerSeasonTotals = data.playerSeasonTotals || {}
  const playerEarnedByTeam = data.playerEarnedByTeam?.[storedTeam] || {}

  // Matches started: count completed rounds where player was a starter for this team
  const playerMatches = {}
  Object.entries(data.submittedLineups || {}).forEach(([r, teams]) => {
    const roundCfg = data.rounds?.find(rd => rd.round === Number(r))
    if (!roundCfg || roundCfg.status !== 'complete') return
    const lineup = teams[storedTeam] || []
    lineup.forEach(p => {
      if (p.isSub) return
      playerMatches[p.name] = (playerMatches[p.name] || 0) + 1
    })
  })

  // Ordinal suffix
  function ordinal(n) {
    if (!n) return '—'
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  const cutoffLabel = nextCutoff
    ? new Date(nextCutoff).toLocaleDateString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <div className="myteam-screen">
      <div className="screen-header">
        <div className="screen-header-top">
          <h1>{storedTeam}</h1>
          <button className="change-team-btn" onClick={onChangeTeam}>Change team</button>
        </div>
        <p className="subtitle">Deloitte Tax Fantasy AFL 2026</p>
      </div>

      {/* Key metrics */}
      <div className="myteam-metrics">
        <div className="myteam-metric-card">
          <div className="myteam-metric-label">Season points</div>
          <div className="myteam-metric-value">{totalFor.toLocaleString()}</div>
          <div className="myteam-metric-sub">Rounds 1–{data.currentRound}</div>
        </div>
        <div className="myteam-metric-card">
          <div className="myteam-metric-label">Ladder position</div>
          <div className="myteam-metric-value">{ordinal(position)}</div>
          <div className="myteam-metric-sub">of {data.teams?.length ?? '—'} teams</div>
        </div>
      </div>

      {/* Next match */}
      {nextMatch && (
        <div className="myteam-section">
          <div className="myteam-section-label">Next match</div>
          <button
            className="myteam-next-match"
            onClick={() => onNextMatchClick?.(nextMatch, nextRound)}
          >
            <div>
              <div className="myteam-next-teams">
                {nextMatch.home} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>v</span> {nextMatch.away}
              </div>
              <div className="myteam-next-meta">
                Round {nextRound}
                {cutoffLabel && ` · Closes ${cutoffLabel}`}
                {nextSubmitted && <span className="myteam-submitted-tag"> · ✓ Submitted</span>}
              </div>
            </div>
            <span className="myteam-chevron">›</span>
          </button>
        </div>
      )}

      {/* Squad */}
      <div className="myteam-section">
        <div className="myteam-section-label">My squad</div>
        {POSITION_ORDER.map(pos => {
          const posPlayers = displayRoster.filter(p => p.position === pos)
          if (!posPlayers.length) return null
          return (
            <div key={pos} className="myteam-pos-group">
              <div className="myteam-pos-header">{POSITION_LABEL[pos].toUpperCase()}</div>
              {posPlayers.map(p => (
                <PlayerRow
                  key={p.name}
                  player={p}
                  seasonTotal={playerSeasonTotals[p.name]}
                  earnedTotal={playerEarnedByTeam[p.name]}
                  matches={playerMatches[p.name]}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
