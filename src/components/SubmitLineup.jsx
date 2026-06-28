import { useState, useRef } from 'react'
import { submitLineup } from '../api.js'

const POSITION_ORDER = ['Defender', 'Midfielder', 'Forward', 'Ruck']
const POSITION_LABELS = {
  Defender: 'Defenders',
  Midfielder: 'Midfielders',
  Forward: 'Forwards',
  Ruck: 'Ruck',
}
const POSITION_LIMITS = { Defender: 3, Midfielder: 4, Forward: 3, Ruck: 1 }

function cutoffLabel(cutoff) {
  if (!cutoff) return null
  const date = new Date(cutoff)
  if (date <= new Date()) return 'Submissions closed'
  return 'Closes ' + date.toLocaleDateString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

function isPastCutoff(cutoff) {
  return cutoff ? new Date(cutoff) <= new Date() : false
}

/**
 * Build ordered player list from roster (and optional existing lineup).
 * Returns flat array sorted by position then priority.
 */
function buildPlayerList(roster, roundNum, existingLineup) {
  if (!roster) return []
  const available = roster.filter(p => (p.from_round || 1) <= roundNum)

  if (existingLineup && existingLineup.length > 0) {
    // Use submitted order, fall back to roster for anyone missing
    const submitted = [...existingLineup].sort((a, b) => {
      const pi = POSITION_ORDER.indexOf(a.position)
      const qi = POSITION_ORDER.indexOf(b.position)
      return pi !== qi ? pi - qi : a.priority - b.priority
    })
    const submittedNames = new Set(submitted.map(p => p.name))
    // Add any roster players not in submitted lineup (as subs at the end)
    const rosterMap = Object.fromEntries(available.map(p => [p.name, p]))
    const extras = available.filter(p => !submittedNames.has(p.name))
    const extrasByPos = {}
    for (const pos of POSITION_ORDER) extrasByPos[pos] = []
    for (const p of extras) if (extrasByPos[p.position]) extrasByPos[p.position].push(p)

    const result = submitted.map(p => ({
      name: p.name,
      position: p.position,
      afl_team: rosterMap[p.name]?.afl_team || '',
      isSub: p.isSub,
    }))
    for (const pos of POSITION_ORDER) {
      for (const p of extrasByPos[pos]) result.push({ name: p.name, position: pos, afl_team: p.afl_team, isSub: true })
    }
    return result
  }

  // Default: roster sheet order, auto-assign isSub by position
  const grouped = {}
  for (const pos of POSITION_ORDER) grouped[pos] = []
  for (const p of available) if (grouped[p.position]) grouped[p.position].push(p)

  const result = []
  for (const pos of POSITION_ORDER) {
    const limit = POSITION_LIMITS[pos] ?? 99
    grouped[pos].forEach((p, i) => {
      result.push({ name: p.name, position: pos, afl_team: p.afl_team, isSub: i >= limit })
    })
  }
  return result
}

/** Swap a player one step up or down within their position group */
function movePlayer(players, name, direction) {
  const idx = players.findIndex(p => p.name === name)
  if (idx === -1) return players
  const pos = players[idx].position
  const posIdxs = players.map((p, i) => p.position === pos ? i : -1).filter(i => i >= 0)
  const rank = posIdxs.indexOf(idx)
  const swapRank = direction === 'up' ? rank - 1 : rank + 1
  if (swapRank < 0 || swapRank >= posIdxs.length) return players
  const next = [...players]
  ;[next[idx], next[posIdxs[swapRank]]] = [next[posIdxs[swapRank]], next[idx]]
  // Recompute isSub
  const limit = POSITION_LIMITS[pos] ?? 99
  let rank2 = 0
  return next.map(p => {
    if (p.position !== pos) return p
    return { ...p, isSub: rank2++ >= limit }
  })
}

export default function SubmitLineup({ data, roundNum, onClose }) {
  const roundData = data.rounds.find(r => r.round === roundNum)

  const _storedCode = localStorage.getItem('ff_team_code')?.toUpperCase() || ''
  const _storedTeam = _storedCode ? (data.teamCodes?.[_storedCode] || null) : null

  const [step, setStep] = useState(_storedTeam ? 2 : 1)
  const [teamCode, setTeamCode] = useState(_storedTeam ? _storedCode : '')
  const [teamName, setTeamName] = useState(_storedTeam || '')
  const [codeError, setCodeError] = useState('')
  const [players, setPlayers] = useState(() => {
    if (!_storedTeam) return []
    const existingLineup = data.submittedLineups?.[roundNum]?.[_storedTeam] || []
    return buildPlayerList(data.rosters?.[_storedTeam], roundNum, existingLineup)
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Touch drag state
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const pastCutoff = isPastCutoff(roundData?.cutoff)
  const countdown = cutoffLabel(roundData?.cutoff)

  function handleCodeSubmit() {
    const code = teamCode.trim().toUpperCase()
    const team = data.teamCodes?.[code]
    if (!team) { setCodeError('Team code not found. Check your code and try again.'); return }
    setCodeError('')
    setTeamName(team)
    const existingLineup = data.submittedLineups?.[roundNum]?.[team] || []
    setPlayers(buildPlayerList(data.rosters?.[team], roundNum, existingLineup))
    setStep(2)
  }

  function handleDragStart(name) { dragItem.current = name }
  function handleDragEnter(name) { dragOverItem.current = name }
  function handleDragEnd() {
    const from = dragItem.current
    const to = dragOverItem.current
    if (!from || !to || from === to) { dragItem.current = null; dragOverItem.current = null; return }
    setPlayers(prev => {
      const fromIdx = prev.findIndex(p => p.name === from)
      const toIdx   = prev.findIndex(p => p.name === to)
      if (fromIdx === -1 || toIdx === -1) return prev
      if (prev[fromIdx].position !== prev[toIdx].position) return prev // only within same position
      const next = [...prev]
      next.splice(toIdx, 0, next.splice(fromIdx, 1)[0])
      // Recompute isSub
      const pos   = prev[fromIdx].position
      const limit = POSITION_LIMITS[pos] ?? 99
      let rank = 0
      return next.map(p => p.position !== pos ? p : { ...p, isSub: rank++ >= limit })
    })
    dragItem.current = null; dragOverItem.current = null
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError('')
    try {
      let priority = {}
      for (const pos of POSITION_ORDER) {
        let n = 1
        for (const p of players.filter(pl => pl.position === pos)) priority[p.name] = n++
      }
      const payload = {
        round: roundNum,
        team: teamName,
        teamCode: teamCode.trim().toUpperCase(),
        submittedAt: new Date().toISOString(),
        players: players.map(p => ({
          name: p.name,
          position: p.position,
          priority: priority[p.name],
          isSub: p.isSub,
        })),
      }
      const result = await submitLineup(payload)
      if (result?.error) throw new Error(result.error)
      // Remember team code so the rounds screen can show submitted status
      localStorage.setItem('ff_team_code', teamCode.trim().toUpperCase())
      setSubmitted(true)
    } catch {
      setSubmitError('Something went wrong, try again')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step 1: Team code ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="submit-overlay">
        <div className="submit-overlay-header">
          <button className="close-btn" onClick={onClose}>✕</button>
          <span className="submit-overlay-title">Submit Lineup</span>
        </div>
        <div className="team-code-step">
          <h2>Enter your team code</h2>
          <p className="step-subtitle">Your unique team code</p>
          <input
            className="team-code-input"
            type="text"
            value={teamCode}
            onChange={e => setTeamCode(e.target.value.toUpperCase())}
            placeholder="WANDO001"
            maxLength={10}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
          />
          {codeError && <p className="form-error">{codeError}</p>}
          <button className="btn-primary" onClick={handleCodeSubmit} disabled={!teamCode.trim()}>
            Continue
          </button>
        </div>
      </div>
    )
  }

  // ── Success: show submitted lineup in read-only view ─────────
  if (submitted) {
    const submittedGroups = {}
    for (const pos of POSITION_ORDER) submittedGroups[pos] = players.filter(p => p.position === pos)
    return (
      <div className="submit-overlay">
        <div className="submit-overlay-header">
          <button className="close-btn" onClick={onClose}>✕</button>
          <span className="submit-overlay-title">{teamName}</span>
          <span className="submit-round-label">Round {roundNum}</span>
        </div>
        <div className="submitted-banner">
          <span className="submitted-tick">✓</span> Lineup submitted
          {countdown && <span className="submitted-countdown"> · {countdown}</span>}
        </div>
        <div className="roster-scroll">
          {POSITION_ORDER.map(pos => {
            const posPlayers = submittedGroups[pos] || []
            if (!posPlayers.length) return null
            const limit = POSITION_LIMITS[pos]
            return (
              <div key={pos} className="roster-position-group">
                <div className="roster-position-header">
                  <span className="pos-label">{POSITION_LABELS[pos].toUpperCase()}</span>
                  <span className="pos-count pos-count-full">{limit} starters</span>
                </div>
                {posPlayers.map((p, i) => {
                  const isLastStarter = i === limit - 1 && posPlayers.length > limit
                  return (
                    <div key={p.name}>
                      <div className={`player-order-row ${p.isSub ? 'is-sub' : 'is-starter'}`}>
                        <span className={`priority-badge ${p.isSub ? 'badge-sub' : 'badge-starter'}`}>{i + 1}</span>
                        <span className="player-name">{p.name}</span>
                        {p.isSub && <span className="player-role-tag">Sub</span>}
                      </div>
                      {isLastStarter && <div className="starter-divider"><span>Subs</span></div>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        {!pastCutoff && (
          <div className="submit-footer">
            <button className="btn-primary btn-submit" onClick={() => setSubmitted(false)}>
              Edit lineup
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Step 2: Drag to order ─────────────────────────────────────
  const groupedPlayers = {}
  for (const pos of POSITION_ORDER) groupedPlayers[pos] = players.filter(p => p.position === pos)

  return (
    <div className="submit-overlay">
      <div className="submit-overlay-header">
        <button className="back-btn" onClick={() => setStep(1)}>‹ Back</button>
        <span className="submit-overlay-title">{teamName}</span>
        <span className="submit-round-label">Round {roundNum}</span>
      </div>

      {pastCutoff
        ? <div className="cutoff-notice">Submissions closed</div>
        : <div className="countdown-banner">{countdown}</div>}

      {!pastCutoff && (
        <p className="lineup-hint">Drag ☰ to reorder. Top {POSITION_LIMITS.Defender} Def · {POSITION_LIMITS.Midfielder} Mid · {POSITION_LIMITS.Forward} Fwd · {POSITION_LIMITS.Ruck} Ruck are starters.</p>
      )}

      <div className="roster-scroll">
        {POSITION_ORDER.map(pos => {
          const posPlayers = groupedPlayers[pos] || []
          if (!posPlayers.length) return null
          const limit = POSITION_LIMITS[pos]
          return (
            <div key={pos} className="roster-position-group">
              <div className="roster-position-header">
                <span className="pos-label">{POSITION_LABELS[pos].toUpperCase()}</span>
                <span className="pos-count pos-count-full">{limit} starters</span>
              </div>
              {posPlayers.map((p, i) => {
                const isLastStarter = i === limit - 1 && posPlayers.length > limit
                return (
                  <div key={p.name}>
                    <div
                      className={`player-order-row ${p.isSub ? 'is-sub' : 'is-starter'}`}
                      draggable={!pastCutoff}
                      onDragStart={() => handleDragStart(p.name)}
                      onDragEnter={() => handleDragEnter(p.name)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                    >
                      <span className={`priority-badge ${p.isSub ? 'badge-sub' : 'badge-starter'}`}>
                        {i + 1}
                      </span>
                      <span className="player-name">{p.name}</span>
                      {p.isSub && <span className="player-role-tag">Sub</span>}
                      {!pastCutoff && (
                        <div className="reorder-btns">
                          <button className="reorder-btn" onClick={() => setPlayers(prev => movePlayer(prev, p.name, 'up'))} disabled={i === 0}>▲</button>
                          <button className="reorder-btn" onClick={() => setPlayers(prev => movePlayer(prev, p.name, 'down'))} disabled={i === posPlayers.length - 1}>▼</button>
                        </div>
                      )}
                      {!pastCutoff && <span className="drag-handle">☰</span>}
                    </div>
                    {isLastStarter && <div className="starter-divider"><span>Subs</span></div>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {!pastCutoff && players.length > 0 && (
        <div className="submit-footer">
          {submitError && <p className="form-error">{submitError}</p>}
          <button className="btn-primary btn-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Lineup'}
          </button>
        </div>
      )}
    </div>
  )
}
