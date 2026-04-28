import { google } from 'googleapis'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './firebase'
import { decrypt, encrypt } from './encryption'
import { getOrRefreshToken } from './tokenCache'

async function getDecryptedRefreshToken(uid: string): Promise<string> {
  const doc = await db.collection(`users/${uid}/google_tokens`).doc('token').get()
  if (!doc.exists) throw new Error(`No refresh token for uid ${uid}`)
  const { refreshToken } = doc.data()!
  return decrypt(refreshToken.ciphertext, refreshToken.iv, refreshToken.tag)
}

async function buildOAuth2Client(uid: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  const accessToken = await getOrRefreshToken(uid, async () => {
    const refreshToken = await getDecryptedRefreshToken(uid)
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oauth2Client.refreshAccessToken()

    if (credentials.refresh_token) {
      const encrypted = encrypt(credentials.refresh_token)
      await db.collection(`users/${uid}/google_tokens`).doc('token')
        .update({ refreshToken: encrypted, updatedAt: FieldValue.serverTimestamp() })
    }

    return { token: credentials.access_token!, expiry: credentials.expiry_date! }
  })

  oauth2Client.setCredentials({ access_token: accessToken })
  return oauth2Client
}

export async function getGmailClient(uid: string) {
  const auth = await buildOAuth2Client(uid)
  return google.gmail({ version: 'v1', auth })
}

export async function getCalendarClient(uid: string) {
  const auth = await buildOAuth2Client(uid)
  return google.calendar({ version: 'v3', auth })
}
