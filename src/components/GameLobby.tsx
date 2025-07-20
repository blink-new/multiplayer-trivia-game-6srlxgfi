import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, Play, Trophy, Zap } from 'lucide-react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useToast } from '../hooks/use-toast'
import type { User, Room } from '../types'

interface GameLobbyProps {
  user: User
  onJoinRoom: (room: Room) => void
}

export default function GameLobby({ user, onJoinRoom }: GameLobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { toast } = useToast()

  const loadRooms = useCallback(async () => {
    try {
      const roomsData = await blink.db.rooms.list({
        where: { status: 'waiting' },
        orderBy: { createdAt: 'desc' },
        limit: 10
      })
      setRooms(roomsData)
    } catch (error) {
      console.error('Failed to load rooms:', error)
      toast({
        title: "Error",
        description: "Failed to load game rooms",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room name",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    try {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const room = await blink.db.rooms.create({
        id: roomId,
        name: newRoomName.trim(),
        hostUserId: user.id,
        status: 'waiting',
        currentQuestionIndex: 0
      })

      // Add creator as first player
      await blink.db.players.create({
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        roomId: roomId,
        userId: user.id,
        displayName: user.displayName || user.email.split('@')[0],
        score: 0
      })

      toast({
        title: "Success!",
        description: `Room "${newRoomName}" created successfully!`
      })

      onJoinRoom(room)
    } catch (error) {
      console.error('Failed to create room:', error)
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
      setNewRoomName('')
      setShowCreateForm(false)
    }
  }

  const joinRoom = async (room: Room) => {
    setJoining(room.id)
    try {
      // Check if user is already in the room
      const existingPlayer = await blink.db.players.list({
        where: { 
          AND: [
            { roomId: room.id },
            { userId: user.id }
          ]
        },
        limit: 1
      })

      if (existingPlayer.length === 0) {
        // Add player to room
        await blink.db.players.create({
          id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          roomId: room.id,
          userId: user.id,
          displayName: user.displayName || user.email.split('@')[0],
          score: 0
        })
      }

      toast({
        title: "Joined!",
        description: `Welcome to "${room.name}"`
      })

      onJoinRoom(room)
    } catch (error) {
      console.error('Failed to join room:', error)
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      })
    } finally {
      setJoining(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12 pt-8"
        >
          <h1 className="text-5xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
            <Trophy className="w-12 h-12" />
            Trivia Master
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Welcome back, <span className="text-primary font-semibold">{user.displayName || user.email.split('@')[0]}</span>!
          </p>
          <p className="text-muted-foreground">
            Join a room or create your own to start the ultimate trivia challenge
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{rooms.length}</div>
              <div className="text-sm text-muted-foreground">Active Rooms</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-secondary/20">
            <CardContent className="p-6 text-center">
              <Zap className="w-8 h-8 text-secondary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">10</div>
              <div className="text-sm text-muted-foreground">Questions Ready</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-accent/20">
            <CardContent className="p-6 text-center">
              <Play className="w-8 h-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">Fast</div>
              <div className="text-sm text-muted-foreground">Game Mode</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Create Room Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Plus className="w-5 h-5" />
                Create New Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showCreateForm ? (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Room
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter room name..."
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                    className="flex-1"
                  />
                  <Button
                    onClick={createRoom}
                    disabled={creating}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewRoomName('')
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Available Rooms */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Available Rooms
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <Card className="text-center p-12">
              <CardContent>
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Active Rooms</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create a room and start the trivia fun!
                </p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Room
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30 bg-card/80 backdrop-blur">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-lg text-foreground truncate">
                          {room.name}
                        </h3>
                        <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                          Waiting
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>Players joining...</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(room.createdAt).toLocaleTimeString()}
                        </div>
                      </div>

                      <Button
                        onClick={() => joinRoom(room)}
                        disabled={joining === room.id}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {joining === room.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Joining...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Join Game
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}