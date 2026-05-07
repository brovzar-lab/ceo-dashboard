import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '')
        .replace(/^"/, '').replace(/"$/, '')  // strip surrounding quotes
        .replace(/\\n/g, '\n'),                // convert literal \n to real newlines
    }),
  })
}

export const db = getFirestore()
