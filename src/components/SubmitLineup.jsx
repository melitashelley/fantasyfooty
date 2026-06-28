import { useState } from 'react'
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

function buildPlayerList(roster, roundNum, existingLineup) {
  if (!roster) return []
  const available = roster.filter(p => (p.from_round || 1) <= roundNum)
  const rosterMap = Object.fromEntries(available.map(p => [p.name, p]))

  if (existingLineup && existingLineup.length > 0) {
    const submittedNames = new Set(existingLineup.map(p => p.name))

    // Derive subPriority per position: sort subs within each position by priority ascending → 1, 2, 3…
    const subPriorityMap = {}
    for (const pos of POSITION_ORDER) {
      existingLineup
        .filter(p => p.isSub && p.position === pos)
        .sort((a, b) => a.priority - b.priority)
        .forEach((p, i) => { subPriorityMap[p.name] = i + 1 })
    }

    const result = existingLineup.map(lp => ({
      name: lp.name,
      position: lp.position,
      afl_team: rosterMap[lp.name]?.afl_team || '',
      isSub: lp.isSub,
      subPriority: lp.isSub ? (subPriorityMap[lp.name] ?? null) : null,
    }))

    // Add any roster players missing from the submission as subs
    available
      .filter(p => !submittedNames.has(p.name))
      .forEach(p => result.push({ name: p.name, position: p.position, afl_team: p.afl_team, isSub: true, subPriority: null }))

    result.sort((a, b) => {
      const pi = POSITION_ORDER.indexOf(a.position)
      const qi = POSITION_ORDER.indexOf(b.position)
      if (pi !== qi) return pi - qi
      return a.name.localeCompare(b.name)
    })
    return result
  }

  // Default: alphabetical within each position, auto-assign isSub by limits
  const grouped = {}
  for (const pos of POSITION_ORDER) grouped[pos] = []
  for (const p of available) if (grouped[p.position]) grouped[p.position].push(p)

  const result = []
  for (const pos of POSITION_ORDER) {
    const limit = POSITION_LIMITS[pos] ?? 99
    grouped[pos].sort((a, b) => a.name.localeCompare(b.name))
    grouped[pos].forEach((p, i) => {
      result.push({ name: p.name, position: pos, afl_team: p.afl_team, isSub: i >= limit, subPriority: null })
    })
  }
  return result
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

  function toggleStarter(name) {
    setPlayers(prev => {
      const idx = prev.findIndex(p => p.name === name)
      if (idx === -1) return prev
      const player = prev[idx]
      const pos = player.position
      const limit = POSITION_LIMITS[pos] ?? 99
      const next = [...prev]

      if (player.isSub) {
        // Promote to starter — if at limit, demote the last starter alphabetically
        const starterCount = prev.filter(p => p.position === pos && !p.isSub).length
        if (starterCount >= limit) {
          const lastStarterIdx = prev
            .map((p, i) => ({ ...p, _i: i }))
            .filter(p => p.position === pos && !p.isSub)
            .sort((a, b) => b.name.localeCompare(a.name))[0]._i
          next[lastStarterIdx] = { ...prev[lastStarterIdx], isSub: true, subPriority: null }
        }
        next[idx] = { ...player, isSub: false, subPriority: null }
      } else {
        // Demote to sub
        next[idx] = { ...player, isSub: true, subPriority: null }
      }
      return next
    })
  }

  function setSubPriority(name, position, priority) {
    setPlayers(prev => prev.map(p => {
      if (p.name === name) return { ...p, subPriority: priority }
      if (p.position === position && p.isSub && p.subPriority === priority) return { ...p, subPriority: null }
      return p
    }))
  }

  function clearSelection() {
    setPlayers(prev => {
      const grouped = {}
      for (const pos of POSITION_ORDER) grouped[pos] = []
      for (const p of prev) if (grouped[p.position]) grouped[p.position].push(p)
      const result = []
      for (const pos of POSITION_ORDER) {
        const limit = POSITION_LIMITS[pos] ?? 99
        grouped[pos].sort((a, b) => a.name.localeCompare(b.name))
        grouped[pos].forEach((p, i) => result.push({ ...p, isSub: i >= limit, subPriority: null }))
      }
      return result
    })
  }

  function validate() {
    for (const pos of POSITION_ORDER) {
      const posPlayers = players.filter(p => p.position === pos)
      const starterCount = posPlayers.filter(p => !p.isSub).length
      const limit = POSITION_LIMITS[pos]
      if (starterCount !== limit) {
        return `${POSITION_LABELS[pos]}: need exactly ${limit} starter${limit === 1 ? '' : 's'} (have ${starterCount})`
      }
      const subs = posPlayers.filter(p => p.isSub)
      if (subs.some(p => p.subPriority === null)) {
        return `${POSITION_LABELS[pos]}: all subs must have a priority assigned`
      }
      const priorities = subs.map(p => p.subPriority)
      if (new Set(priorities).size !== priorities.length) {
        return `${POSITION_LABELS[pos]}: each sub priority can only be assigned once`
      }
    }
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) { setSubmitError(validationError); return }

    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        round: roundNum,
        team: teamName,
        teamCode: teamCode.trim().toUpperCase(),
        submittedAt: new Date().toISOString(),
        players: players.map(p => {
          if (!p.isSub) {
            const posStarters = players
              .filter(pl => pl.position === p.position && !pl.isSub)
              .sort((a, b) => a.name.localeCompare(b.name))
            const priority = posStarters.findIndex(pl => pl.name === p.name) + 1
            return { name: p.name, position: p.position, priority, isSub: false }
          }
          return { name: p.name, position: p.position, priority: p.subPriority, isSub: true }
        }),
      }
      const result = await submitLineup(payload)
      if (result?.error) throw new Error(result.error)
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

  // ── Success: read-only view ───────────────────────────────────
  if (submitted) {
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
            const starters = players
              .filter(p => p.position === pos && !p.isSub)
              .sort((a, b) => a.name.localeCompare(b.name))
            const subs = players
              .filter(p => p.position === pos && p.isSub)
              .sort((a, b) => (a.subPriority ?? 99) - (b.subPriority ?? 99))
            const posPlayers = [...starters, ...subs]
            if (!posPlayers.length) return null
            return (
              <div key={pos} className="roster-position-group">
                <div className="roster-position-header">
                  <span className="pos-label">{POSITION_LABELS[pos].toUpperCase()}</span>
                  <span className="pos-count pos-count-full">{POSITION_LIMITS[pos]} starters</span>
                </div>
                {starters.length > 0 && subs.length > 0 && (
                  <div className="starter-divider starter-divider--top"><span>Starters</span></div>
                )}
                {starters.map(p => (
                  <div key={p.name} className="player-order-row is-starter">
                    <span className="lineup-dot lineup-dot--starter" />
                    <span className="player-name">{p.name}</span>
                  </div>
                ))}
                {subs.length > 0 && (
                  <div className="starter-divider"><span>Subs</span></div>
                )}
                {subs.map(p => (
                  <div key={p.name} className="player-order-row is-sub">
                    <span className="lineup-dot lineup-dot--sub" />
                    <span className="player-name">{p.name}</span>
                    {p.subPriority != null && <span className="player-role-tag">Sub {p.subPriority}</span>}
                  </div>
                ))}
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

  // ── Step 2: Select starters & sub priorities ──────────────────
  return (
    <div className="submit-overlay">
      <div className="submit-overlay-header">
        <button className="back-btn" onClick={() => _storedTeam ? onClose() : setStep(1)}>‹ Back</button>
        <span className="submit-overlay-title">{teamName}</span>
        <span className="submit-round-label">Round {roundNum}</span>
      </div>

      {pastCutoff
        ? <div className="cutoff-notice">Submissions closed</div>
        : <div className="countdown-banner">{countdown}</div>}

      {!pastCutoff && (
        <p className="lineup-hint">
          Tap ● to toggle starter/sub. Assign sub priorities within each position.
        </p>
      )}

      <div className="roster-scroll">
        {POSITION_ORDER.map(pos => {
          const posPlayers = players.filter(p => p.position === pos)
          if (!posPlayers.length) return null
          const limit = POSITION_LIMITS[pos]
          const starterCount = posPlayers.filter(p => !p.isSub).length
          const subCount = posPlayers.length - limit
          return (
            <div key={pos} className="roster-position-group">
              <div className="roster-position-header">
                <span className="pos-label">{POSITION_LABELS[pos].toUpperCase()}</span>
                <span className={`pos-count ${starterCount === limit ? 'pos-count-full' : 'pos-count-warn'}`}>
                  {starterCount}/{limit} starters
                </span>
              </div>
              {posPlayers.map(p => (
                <div key={p.name} className={`player-order-row ${p.isSub ? 'is-sub' : 'is-starter'}`}>
                  <button
                    className="lineup-toggle-btn"
                    onClick={() => !pastCutoff && toggleStarter(p.name)}
                    disabled={pastCutoff}
                    aria-label={p.isSub ? 'Make starter' : 'Make sub'}
                  >
                    <span className={`lineup-dot ${p.isSub ? 'lineup-dot--sub' : 'lineup-dot--starter'}`} />
                  </button>
                  <span className="player-name">{p.name}</span>
                  {p.isSub && !pastCutoff && (
                    <div className="sub-priority-btns">
                      {Array.from({ length: subCount }, (_, i) => i + 1).map(n => (
                        <button
                          key={n}
                          className={`sub-priority-btn ${p.subPriority === n ? 'sub-priority-btn--active' : ''}`}
                          onClick={() => setSubPriority(p.name, pos, p.subPriority === n ? null : n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                  {p.isSub && pastCutoff && p.subPriority != null && (
                    <span className="player-role-tag">Sub {p.subPriority}</span>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {!pastCutoff && players.length > 0 && (
        <button className="clear-selection-btn" onClick={clearSelection}>
          Clear selection
        </button>
      )}

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
