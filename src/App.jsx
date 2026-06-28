import { useState, useEffect } from 'react'
import './App.css'
import BottomNav from './components/BottomNav.jsx'
import MyTeam from './components/MyTeam.jsx'
import Ladder from './components/Ladder.jsx'
import Rounds from './components/Rounds.jsx'
import MatchDetail from './components/MatchDetail.jsx'
import UpcomingMatchDetail from './components/UpcomingMatchDetail.jsx'
import SubmitLineup from './components/SubmitLineup.jsx'
import TeamSetup from './components/TeamSetup.jsx'
import { fetchData } from './api.js'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('myteam')
  const [navStack, setNavStack] = useState([])
  const [showSubmitLineup, setShowSubmitLineup] = useState(false)
  const [submitRound, setSubmitRound] = useState(null)
  const [teamCode, setTeamCode] = useState(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem('ff_team_code') : null)
  )

  function loadData() {
    setLoading(true)
    setError(null)
    fetchData()
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { loadData() }, [])

  function handleTabChange(newTab) {
    setTab(newTab)
    setNavStack([])
    setShowSubmitLineup(false)
    setSubmitRound(null)
  }

  function handleMatchClick(match, roundNum) {
    setNavStack((prev) => [...prev, { match, roundNum, type: 'match' }])
  }

  function handleUpcomingMatchClick(match, roundNum) {
    setNavStack((prev) => [...prev, { match, roundNum, type: 'upcoming' }])
  }

  function popView() {
    setNavStack((prev) => prev.slice(0, -1))
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-loading">
        <p className="error-msg">Failed to load data</p>
        <button className="retry-btn" onClick={loadData}>Retry</button>
      </div>
    )
  }

  const currentView = navStack.length > 0 ? navStack[navStack.length - 1] : null
  const currentRoundData = data.rounds.find((r) => r.round === data.currentRound)

  // First-time setup: no team code stored yet
  if (!teamCode) {
    if (loading) return <div className="app-loading"><div className="spinner" /></div>
    if (error) return <div className="app-loading"><p className="error-msg">Failed to load data</p><button className="retry-btn" onClick={loadData}>Retry</button></div>
    return (
      <div className="app">
        <TeamSetup
          data={data}
          onComplete={(code) => setTeamCode(code)}
        />
      </div>
    )
  }

  if (showSubmitLineup) {
    return (
      <div className="app">
        <SubmitLineup
          data={data}
          roundNum={submitRound}
          onClose={() => { setShowSubmitLineup(false); setSubmitRound(null) }}
        />
      </div>
    )
  }

  function renderContent() {
    if (currentView) {
      if (currentView.type === 'upcoming') {
        return (
          <UpcomingMatchDetail
            match={currentView.match}
            roundNum={currentView.roundNum}
            data={data}
            onBack={popView}
            onSubmitLineup={(round) => { setSubmitRound(round); setShowSubmitLineup(true) }}
          />
        )
      }
      return (
        <MatchDetail
          match={currentView.match}
          roundNum={currentView.roundNum}
          onBack={popView}
        />
      )
    }
    if (tab === 'ladder') return <Ladder data={data} />
    if (tab === 'myteam') return (
      <MyTeam
        data={data}
        onNextMatchClick={(match, roundNum) => handleUpcomingMatchClick(match, roundNum)}
        onChangeTeam={() => { localStorage.removeItem('ff_team_code'); setTeamCode(null) }}
      />
    )
    return (
      <Rounds
        data={data}
        onMatchClick={handleMatchClick}
        onUpcomingMatchClick={handleUpcomingMatchClick}
        onSubmitLineup={(round) => { setSubmitRound(round); setShowSubmitLineup(true) }}
      />
    )
  }

  return (
    <div className="app">
      <div className="app-content">
        {renderContent()}
      </div>
      <BottomNav tab={tab} onTabChange={handleTabChange} />
    </div>
  )
}
