export default function Fixture({ data }) {
  const currentRound = data.currentRound

  return (
    <div>
      <div className="screen-header">
        <h1>Fixture</h1>
        <p className="subtitle">2026 season · 18 home-and-away rounds</p>
      </div>
      <div className="fixture-content">
        {data.fixture.map((r) => (
          <div key={r.round} className="fixture-round-group">
            <div className="fixture-round-header">
              Round {r.round}
              {r.round === currentRound && (
                <span className="current-pill">Current</span>
              )}
            </div>
            {r.matches.map((m, i) => (
              <div
                key={i}
                className={`fixture-match-row${r.round === currentRound ? ' current-round-row' : ''}`}
              >
                <span className="fixture-home">{m.home}</span>
                <span className="fixture-v">v</span>
                <span className="fixture-away">{m.away}</span>
              </div>
            ))}
          </div>
        ))}

        <div className="fixture-round-group">
          <div className="fixture-round-header">Finals</div>
          <div className="fixture-finals">
            <div className="fixture-finals-title">Rounds 19–24</div>
            <div className="fixture-finals-desc">Finals format: McIntyre Final 5</div>
          </div>
        </div>
      </div>
    </div>
  )
}
