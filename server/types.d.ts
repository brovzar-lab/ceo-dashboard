declare module 'express-session' {
  interface SessionData {
    uid: string
    email: string
  }
}
