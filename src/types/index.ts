export interface User {
  id: string
  email: string
  displayName?: string
}

export interface Room {
  id: string
  name: string
  hostUserId: string
  status: 'waiting' | 'playing' | 'finished'
  currentQuestionIndex: number
  createdAt: string
}

export interface Player {
  id: string
  roomId: string
  userId: string
  displayName: string
  score: number
}

export interface Question {
  id: string
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface GameAnswer {
  id: string
  roomId: string
  questionId: string
  userId: string
  selectedAnswer: string
  isCorrect: boolean
  answeredAt: string
}