// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBY1lqKwZ_ACKs5NZqHzR88NNzAL4ZsYUk",
  authDomain: "lifeease-mastery.firebaseapp.com",
  projectId: "lifeease-mastery",
  storageBucket: "lifeease-mastery.firebasestorage.app",
  messagingSenderId: "563103595929",
  appId: "1:563103595929:web:68ec094cdd5c339c7ae708",
  measurementId: "G-ERQRPD6MQ3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

