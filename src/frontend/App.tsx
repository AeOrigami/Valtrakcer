
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import valtracker from '/valtrack.svg'
import './style.css'

function App() {
  const navigate = useNavigate()
  const [playerQuery, setPlayerQuery] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedQuery = playerQuery.trim()
    if (!normalizedQuery) {
      return
    }

    navigate(`/profile/${encodeURIComponent(normalizedQuery)}`)
  }

  return (
    <>
      <div className="container align-items-center home-shell">
        <div>
          <img src={valtracker} className="logo" alt="valtracker" />
        </div>
        <h1>ValTracker</h1>
        <p className="home-subtitle">Search a Valorant player using the format Name#Tag.</p>

        <form className="home-search-form" onSubmit={handleSubmit}>
          <input
            className="home-search-input"
            type="text"
            value={playerQuery}
            onChange={(event) => setPlayerQuery(event.target.value)}
            placeholder="Enter player name#tag"
            aria-label="Player name and tag"
          />
          <button type="submit" className="home-search-button">Open Profile</button>
        </form>

        <div className="home-actions-section">
          <button onClick={() => navigate('/leaderboard')} className="home-search-button">
            View Leaderboard
          </button>
        </div>
      </div>
    </>
  )
}

export default App
