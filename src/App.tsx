import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import GameLobby from './components/GameLobby'
import TriviaRoom from './components/TriviaRoom'
import type { User, Room } from './types'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🎯 Multiplayer Trivia</h1>
          <p className="text-gray-300 mb-8">Sign in to join the competition!</p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Sign In to Play
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {currentRoom ? (
        <TriviaRoom 
          room={currentRoom} 
          user={user} 
          onLeaveRoom={() => setCurrentRoom(null)} 
        />
      ) : (
        <GameLobby 
          user={user} 
          onJoinRoom={setCurrentRoom} 
        />
      )}
    </div>
  )
}

export default App