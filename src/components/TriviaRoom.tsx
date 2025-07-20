import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, Users, Trophy, Smile, Heart, ThumbsUp, Zap, Play } from 'lucide-react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { useToast } from '../hooks/use-toast'
import type { User, Room, Player, Question, GameAnswer } from '../types'

interface TriviaRoomProps {
  user: User
  room: Room
  onLeaveRoom: () => void
}



export default function TriviaRoom({ user, room, onLeaveRoom }: TriviaRoomProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [timeLeft, setTimeLeft] = useState(15)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<GameAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadGameData = useCallback(async () => {
    try {
      // Load players
      const playersData = await blink.db.players.list({
        where: { roomId: room.id },
        orderBy: { score: 'desc' },
        limit: 20
      })
      setPlayers(playersData)

      // Load questions
      const questionsData = await blink.db.questions.list({
        orderBy: { id: 'asc' },
        limit: 10
      })
      setQuestions(questionsData)

      if (questionsData.length > 0) {
        setCurrentQuestion(questionsData[0])
      }

      setLoading(false)
    } catch (error) {
      console.error('Failed to load game data:', error)
      toast({
        title: "Error",
        description: "Failed to load game data",
        variant: "destructive"
      })
    }
  }, [room.id, toast])

  useEffect(() => {
    loadGameData()
  }, [loadGameData])

  const nextQuestion = useCallback(() => {
    const nextIndex = questionIndex + 1
    
    if (nextIndex >= questions.length) {
      // Game finished
      setGameStatus('finished')
      return
    }

    setQuestionIndex(nextIndex)
    setCurrentQuestion(questions[nextIndex])
    setSelectedAnswer(null)
    setHasAnswered(false)
    setShowResults(false)
    setTimeLeft(15)
  }, [questionIndex, questions])

  // Timer effect
  useEffect(() => {
    if (gameStatus === 'playing' && timeLeft > 0 && !hasAnswered) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !hasAnswered) {
      // Time's up, show results
      setShowResults(true)
      setTimeout(() => {
        nextQuestion()
      }, 3000)
    }
  }, [gameStatus, timeLeft, hasAnswered, nextQuestion])

  const startGame = async () => {
    try {
      await blink.db.rooms.update(room.id, {
        status: 'playing',
        currentQuestionIndex: 0
      })
      
      setGameStatus('playing')
      setTimeLeft(15)
      setQuestionIndex(0)
      
      toast({
        title: "Game Started!",
        description: "Good luck everyone!"
      })
    } catch (error) {
      console.error('Failed to start game:', error)
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive"
      })
    }
  }

  const submitAnswer = async (answer: string) => {
    if (hasAnswered || !currentQuestion) return

    setSelectedAnswer(answer)
    setHasAnswered(true)

    try {
      const isCorrect = answer === currentQuestion.correctAnswer
      
      // Save answer to database
      await blink.db.gameAnswers.create({
        id: `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        roomId: room.id,
        userId: user.id,
        questionId: currentQuestion.id,
        selectedAnswer: answer,
        isCorrect
      })

      // Update player score if correct
      if (isCorrect) {
        const currentPlayer = players.find(p => p.userId === user.id)
        if (currentPlayer) {
          await blink.db.players.update(currentPlayer.id, {
            score: currentPlayer.score + 100
          })
        }
      }

      // Show results after a short delay
      setTimeout(() => {
        setShowResults(true)
        setTimeout(() => {
          nextQuestion()
        }, 3000)
      }, 1000)

    } catch (error) {
      console.error('Failed to submit answer:', error)
      toast({
        title: "Error",
        description: "Failed to submit answer",
        variant: "destructive"
      })
    }
  }



  const sendReaction = async (emoji: string) => {
    try {
      await blink.realtime.publish(`trivia-${room.id}`, 'reaction', {
        emoji,
        userId: user.id,
        displayName: players.find(p => p.userId === user.id)?.displayName || 'Player'
      })
    } catch (error) {
      console.error('Failed to send reaction:', error)
    }
  }

  const isHost = room.hostUserId === user.id

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-foreground">Loading Game...</h2>
        </motion.div>
      </div>
    )
  }

  if (gameStatus === 'finished') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
    const winner = sortedPlayers[0]

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-4"
      >
        <div className="max-w-4xl mx-auto pt-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-primary mb-4">🎉 Game Complete!</h1>
            <p className="text-xl text-muted-foreground">
              Congratulations to all players!
            </p>
          </motion.div>

          {/* Winner Podium */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30">
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  🏆 {winner?.displayName || 'Champion'}
                </h2>
                <p className="text-xl text-primary font-semibold">
                  {winner?.score || 0} points
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Final Leaderboard */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">Final Leaderboard</h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Card className={`${index === 0 ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-primary text-primary-foreground' :
                          index === 1 ? 'bg-secondary text-secondary-foreground' :
                          index === 2 ? 'bg-accent text-accent-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-semibold text-foreground">
                          {player.displayName}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-foreground">
                          {player.score}
                        </div>
                        <div className="text-sm text-muted-foreground">points</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <Button
              onClick={onLeaveRoom}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lobby
            </Button>
          </motion.div>
        </div>
      </motion.div>
    )
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
          className="flex items-center justify-between mb-8 pt-4"
        >
          <div className="flex items-center gap-4">
            <Button
              onClick={onLeaveRoom}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{room.name}</h1>
              <p className="text-muted-foreground">
                {gameStatus === 'waiting' ? 'Waiting to start...' : 
                 gameStatus === 'playing' ? `Question ${questionIndex + 1} of ${questions.length}` :
                 'Game finished'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-secondary/20 text-secondary">
              <Users className="w-4 h-4 mr-1" />
              {players.length} players
            </Badge>
            {gameStatus === 'playing' && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                <Clock className="w-4 h-4 mr-1" />
                {timeLeft}s
              </Badge>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3">
            {gameStatus === 'waiting' ? (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center"
              >
                <Card className="p-12">
                  <CardContent>
                    <Trophy className="w-24 h-24 text-primary mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-foreground mb-4">
                      Ready to Play?
                    </h2>
                    <p className="text-muted-foreground mb-8">
                      {players.length} player{players.length !== 1 ? 's' : ''} joined. 
                      {isHost ? ' Start the game when ready!' : ' Waiting for host to start...'}
                    </p>
                    
                    {isHost && (
                      <Button
                        onClick={startGame}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        size="lg"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Start Game
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={questionIndex}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Question Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">
                        Question {questionIndex + 1} of {questions.length}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {currentQuestion?.category} • {currentQuestion?.difficulty}
                      </span>
                    </div>
                    <Progress 
                      value={((questionIndex + 1) / questions.length) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Timer Ring */}
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">{timeLeft}</span>
                      </div>
                      {timeLeft <= 5 && (
                        <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-destructive animate-pulse-ring"></div>
                      )}
                    </div>
                  </div>

                  {/* Question */}
                  <Card className="mb-8">
                    <CardContent className="p-8 text-center">
                      <h2 className="text-2xl font-bold text-foreground mb-4">
                        {currentQuestion?.question}
                      </h2>
                    </CardContent>
                  </Card>

                  {/* Answer Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {currentQuestion && [
                      { key: 'A', text: currentQuestion.optionA },
                      { key: 'B', text: currentQuestion.optionB },
                      { key: 'C', text: currentQuestion.optionC },
                      { key: 'D', text: currentQuestion.optionD }
                    ].map((option) => (
                      <motion.div
                        key={option.key}
                        whileHover={{ scale: hasAnswered ? 1 : 1.02 }}
                        whileTap={{ scale: hasAnswered ? 1 : 0.98 }}
                      >
                        <Button
                          onClick={() => submitAnswer(option.key)}
                          disabled={hasAnswered}
                          className={`w-full h-16 text-left justify-start p-4 ${
                            selectedAnswer === option.key
                              ? showResults
                                ? option.key === currentQuestion.correctAnswer
                                  ? 'bg-green-500 hover:bg-green-500 animate-correct-flash'
                                  : 'bg-red-500 hover:bg-red-500 animate-incorrect-shake'
                                : 'bg-primary hover:bg-primary'
                              : showResults && option.key === currentQuestion.correctAnswer
                              ? 'bg-green-500 hover:bg-green-500'
                              : 'bg-card hover:bg-card/80 border-border'
                          } transition-all duration-300`}
                          variant={selectedAnswer === option.key ? 'default' : 'outline'}
                        >
                          <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 font-bold">
                            {option.key}
                          </span>
                          {option.text}
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Reaction Buttons */}
                  <div className="flex justify-center gap-2">
                    {['😀', '❤️', '👍', '⚡'].map((emoji) => (
                      <Button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        variant="outline"
                        size="sm"
                        className="text-lg"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Players Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Leaderboard
                </h3>
                <div className="space-y-3">
                  {players
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          player.userId === user.id 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-primary text-primary-foreground' :
                            index === 1 ? 'bg-secondary text-secondary-foreground' :
                            index === 2 ? 'bg-accent text-accent-foreground' :
                            'bg-muted-foreground text-background'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {player.displayName}
                            {player.userId === user.id && ' (You)'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {player.score}
                        </span>
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  )
}