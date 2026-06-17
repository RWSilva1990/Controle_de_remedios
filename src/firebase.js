import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getMessaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyAq_YVjcbzdThDjXKPnRwKCQMSyljLpmL4",
  authDomain: "controle-de-medicamentos-rws.firebaseapp.com",
  projectId: "controle-de-medicamentos-rws",
  storageBucket: "controle-de-medicamentos-rws.firebasestorage.app",
  messagingSenderId: "291620521736",
  appId: "1:291620521736:web:e96a20cba5244808ea4ebd"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const messaging = getMessaging(app)
