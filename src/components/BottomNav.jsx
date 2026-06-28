function MyTeamIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function RoundsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function LadderIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

const TABS = [
  { id: 'myteam', label: 'My Team', Icon: MyTeamIcon },
  { id: 'rounds', label: 'Rounds', Icon: RoundsIcon },
  { id: 'ladder', label: 'Ladder', Icon: LadderIcon },
]

export default function BottomNav({ tab, onTabChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => {
        const active = tab === t.id
        return (
          <button
            key={t.id}
            className={`nav-tab${active ? ' active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            <span className="nav-tab-icon">
              <t.Icon active={active} />
            </span>
            <span className="nav-tab-label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
