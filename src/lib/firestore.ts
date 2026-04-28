import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

if (!getApps().length) {
  initializeApp({
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  })
}

export const db = getFirestore()
