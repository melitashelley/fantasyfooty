import { useState } from 'react'

export default function TeamSetup({ data, onComplete }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    const trimmed = code.trim().toUpperCase()
    const team = data.teamCodes?.[trimmed]
    if (!team) {
      setError('Team code not found. Check your code and try again.')
      return
    }
    localStorage.setItem('ff_team_code', trimmed)
    onComplete(trimmed, team)
  }

  return (
    <div className="team-setup-overlay">
      <div className="team-setup-inner">
<h1 className="team-setup-title">Deloitte Tax<br />Fantasy AFL 2026</h1>
        <p className="team-setup-subtitle">Enter your team code to get started. You only need to do this once.</p>
        <input
          className="team-code-input"
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
          placeholder="e.g. WANDO001"
          maxLength={10}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck="false"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" onClick={handleSubmit} disabled={!code.trim()}>
          Let's go →
        </button>
        <p className="team-setup-hint">
          Your team code was sent to you by the competition admin.
        </p>
      </div>
    </div>
  )
}
