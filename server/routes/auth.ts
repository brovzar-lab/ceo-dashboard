import { Router } from 'express'
import { google } from 'googleapis'
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../lib/firebase'
import { encrypt } from '../lib/encryption'
import { setAccessToken } from '../lib/tokenCache'
import { writeAuditLog } from '../lib/auditLog'

export const authRouter = Router()

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
  'profile',
]

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
}

const isProd = process.env.NODE_ENV === 'production'
const STATE_COOKIE = isProd ? '__Host-state' : 'state'
const STATE_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict' as const,
  maxAge: 10 * 60 * 1000,
  path: '/',
}

authRouter.get('/google/start', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex')
  const oauth2Client = makeOAuth2Client()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  })
  res.cookie(STATE_COOKIE, state, STATE_COOKIE_OPTS)
  res.redirect(url)
})

authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query as Record<string, string>
  const storedState = req.cookies?.[STATE_COOKIE]

  if (!state || state !== storedState) {
    return res.status(403).send('State mismatch — possible CSRF')
  }

  res.clearCookie(STATE_COOKIE, { path: '/' })

  const oauth2Client = makeOAuth2Client()
  let tokens: any
  try {
    const result = await oauth2Client.getToken(code)
    tokens = result.tokens
  } catch {
    return res.status(400).send('Token exchange failed')
  }

  oauth2Client.setCredentials(tokens)
  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data: userInfo } = await oauth2Api.userinfo.get()

  const email = userInfo.email!
  const uid = userInfo.id!

  const allowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
  if (!allowed.includes(email.toLowerCase())) {
    return res.status(403).send('Email not authorized')
  }

  const encrypted = encrypt(tokens.refresh_token!)
  await db.collection(`users/${uid}/google_tokens`).doc('token').set({
    refreshToken: encrypted,
    tokenExpiry: new Date(tokens.expiry_date!),
    scope: tokens.scope || '',
    updatedAt: FieldValue.serverTimestamp(),
  })

  setAccessToken(uid, tokens.access_token!, tokens.expiry_date!)

  await db.collection('users').doc(uid).set(
    {
      email,
      displayName: userInfo.name || '',
      photoURL: userInfo.picture || '',
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  req.session.uid = uid
  req.session.email = email

  await db.collection('sessions').doc(req.sessionID).set(
    {
      uid,
      email,
      lastSeenAt: FieldValue.serverTimestamp(),
      absoluteExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
    },
    { merge: true },
  )

  await writeAuditLog(uid, 'login', req.ip || '', req.headers['user-agent'] || '')
  res.redirect('/')
})

authRouter.get('/google/logout', async (req, res) => {
  const uid = req.session?.uid
  if (uid) {
    await writeAuditLog(uid, 'logout', req.ip || '', req.headers['user-agent'] || '')
  }
  req.session.destroy(() => {})
  const sidCookie = isProd ? '__Host-sid' : 'sid'
  res.clearCookie(sidCookie, { path: '/' })
  res.redirect('/')
})
