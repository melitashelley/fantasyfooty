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
        <svg className="team-setup-icon" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Sleeves */}
          <polyline points="10,10 4,22 14,26" />
          <polyline points="54,10 60,22 50,26" />
          {/* Body */}
          <path d="M14,26 L12,58 L52,58 L50,26" />
          {/* Shoulders to neck */}
          <path d="M10,10 C16,8 22,6 26,10 C28,13 32,15 36,10 C40,6 48,8 54,10" />
          {/* Sash */}
          <path d="M26,10 C30,20 36,38 50,52" strokeWidth="7" stroke="currentColor" strokeOpacity="0.12" fill="none" />
          <path d="M26,10 C30,20 36,38 50,52" strokeWidth="2.5" />
        </svg>
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
