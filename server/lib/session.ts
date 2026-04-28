import expressSession = require('express-session')
import { db } from './firebase'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export class FirestoreSessionStore extends expressSession.Store {
  private readonly col = 'sessions'

  get(
    sid: string,
    callback: (err: any, session?: expressSession.SessionData | null) => void,
  ): void {
    db.collection(this.col)
      .doc(sid)
      .get()
      .then((doc) => {
        if (!doc.exists) return callback(null, null)
        const data = doc.data()!
        const now = Date.now()
        const absoluteExpiry: number = data.absoluteExpiry?.toMillis?.() ?? 0
        const lastSeenAt: number = data.lastSeenAt?.toMillis?.() ?? 0
        if (absoluteExpiry < now || lastSeenAt < now - THIRTY_DAYS_MS) {
          this.destroy(sid, () => {})
          return callback(null, null)
        }
        callback(null, { uid: data.uid, email: data.email, cookie: {} as any })
      })
      .catch((err) => callback(err))
  }

  set(
    sid: string,
    session: expressSession.SessionData,
    callback?: (err?: any) => void,
  ): void {
    const now = new Date()
    db.collection(this.col)
      .doc(sid)
      .set(
        {
          uid: (session as any).uid ?? null,
          email: (session as any).email ?? null,
          lastSeenAt: now,
          absoluteExpiry: new Date(now.getTime() + NINETY_DAYS_MS),
        },
        { merge: true },
      )
      .then(() => callback?.())
      .catch((err) => callback?.(err))
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    db.collection(this.col).doc(sid).delete()
      .then(() => callback?.())
      .catch((err) => callback?.(err))
  }

  touch(sid: string, _session: expressSession.SessionData, callback?: () => void): void {
    db.collection(this.col).doc(sid).update({ lastSeenAt: new Date() })
      .then(() => callback?.())
      .catch(() => callback?.())
  }
}
