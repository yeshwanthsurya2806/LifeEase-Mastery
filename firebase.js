// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBY1lqKwZ_ACKs5NZqHzR88NNzAL4ZsYUk",
  authDomain: "lifeease-mastery.firebaseapp.com",
  projectId: "lifeease-mastery",
  storageBucket: "lifeease-mastery.firebasestorage.app",
  messagingSenderId: "563103595929",
  appId: "1:563103595929:web:68ec094cdd5c339c7ae708"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export { signInWithPopup, signOut, onAuthStateChanged };