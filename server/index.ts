import express from 'express'
import path from 'path'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import session = require('express-session')
import { FirestoreSessionStore } from './lib/session'
import { authRouter } from './routes/auth'
import { claudeRouter } from './routes/claude'
import { gmailRouter } from './routes/gmail'
import { calendarRouter } from './routes/calendar'
import { notionRouter } from './routes/notion'
import { requireAuth } from './middleware/requireAuth'

dotenv.config()

export const app = express()

app.use(express.json())
app.use(cookieParser())

const isProd = process.env.NODE_ENV === 'production'
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

if (isProd) {
  const distPath = path.resolve(__dirname, '../dist')
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
