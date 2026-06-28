export default function StatusPill({ status }) {
  if (status === 'in_progress') {
    return (
      <div className="status-pill in-progress">
        <span className="status-dot" />
        In progress · some AFL games remaining
      </div>
    )
  }
  return (
    <div className="status-pill complete">
      Complete
    </div>
  )
}
