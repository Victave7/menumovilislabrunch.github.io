import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5oNK9gFaQN9I7p1hzaAflvdgrNGoNBkY",
  authDomain: "club-2e4c7.firebaseapp.com",
  projectId: "club-2e4c7",
  storageBucket: "club-2e4c7.firebasestorage.app",
  messagingSenderId: "719625587140",
  appId: "1:719625587140:web:f0b0141c8120d580303c91"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);