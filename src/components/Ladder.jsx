import { Fragment } from 'react'

const fmt = new Intl.NumberFormat('en-AU')

export default function Ladder({ data }) {
  const completeRounds = data.rounds
    .filter((r) => r.status === 'complete')
    .sort((a, b) => b.round - a.round)

  const latestComplete = completeRounds[0]
  const ladder = latestComplete ? latestComplete.ladder : []
  const afterRound = latestComplete ? latestComplete.round : null

  return (
    <div>
      <div className="screen-header">
        <h1>Ladder</h1>
        <p className="subtitle">{afterRound ? `After round ${afterRound}` : 'Deloitte Tax Fantasy AFL 2026'}</p>
      </div>
      <div className="ladder-table-wrap">
        <table className="ladder-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="team-cell">Team</th>
              <th>Pts</th>
              <th>W</th>
              <th>For</th>
              <th>Against</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {ladder.map((row) => (
              <Fragment key={row.team}>
                <tr>
                  <td>
                    <span className={`rank-badge ${row.rank <= data.finalsPositions ? 'finals' : 'non-finals'}`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="team-cell">{row.team}</td>
                  <td>{row.points}</td>
                  <td>{row.wins}</td>
                  <td>{fmt.format(row.for)}</td>
                  <td>{fmt.format(row.against)}</td>
                  <td>{row.percentage.toFixed(1)}%</td>
                </tr>
                {row.rank === data.finalsPositions && (
                  <tr className="ladder-divider">
                    <td colSpan={7} />
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
