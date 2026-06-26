import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDCJEYgFMWnEOTav_Hzku28PK88Mi_jQgw",
  authDomain: "controle-de-medicamentos-rws.firebaseapp.com",
  projectId: "controle-de-medicamentos-rws",
  storageBucket: "controle-de-medicamentos-rws.firebasestorage.app",
  messagingSenderId: "291620521736",
  appId: "1:291620521736:web:e96a20cba5244808ea4ebd"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
