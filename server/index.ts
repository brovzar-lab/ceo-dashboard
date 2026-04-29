if (process.env.NODE_ENV === 'production') require('module-alias/register')
import 'dotenv/config'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import session = require('express-session')
import { FirestoreSessionStore } from './lib/session'
import { authRouter } from './routes/auth'
import { claudeRouter } from './routes/claude'
import { gmailRouter } from './routes/gmail'
import { calendarRouter } from './routes/calendar'
import { notionRouter } from './routes/notion'
import { voiceRouter } from './routes/voice'
import { draftReplyRouter } from './routes/draftReply'
import { requireAuth } from './middleware/requireAuth'

export const app = express()

const isProd = process.env.NODE_ENV === 'production'

// Security & logging
app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false }))
app.use(morgan(isProd ? 'combined' : 'dev'))
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use(
  session({
    name: isProd ? '__Host-sid' : 'sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: new FirestoreSessionStore(),
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    },
  }),
)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/csrf', (req, res) => {
  res.json({ data: { token: req.sessionID } })
})

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ data: { uid: req.session.uid, email: req.session.email } })
})

app.use('/auth', authRouter)
app.use('/api/claude', claudeRouter)
app.use('/api/gmail', gmailRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/notion', notionRouter)
app.use('/api/voice-profile', voiceRouter)
app.use('/api/claude/draft-reply', draftReplyRouter)

if (isProd) {
  // Compiled server runs from server/dist/server/index.js
  // Vite output is at project_root/dist/
  const distPath = path.resolve(__dirname, '../../../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

if (require.main === module) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`Server running on :${PORT}`)
  })
}
