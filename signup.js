import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function showToast(message, type = "error") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function mapAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    default:
      return "Unable to create account. Please try again.";
  }
}

async function saveUserProfile(uid, name, email) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    name,
    email,
    createdAt: new Date().toISOString()
  });
}

function initSignupPage() {
  console.log("signup.js loaded");
  const submitSignup = document.getElementById("submitSignup");
  if (!submitSignup) {
    console.error("Signup button not found on page.");
    showToast("Signup page failed to load properly.", "error");
    return;
  }

  submitSignup.addEventListener("click", async (event) => {
    event.preventDefault();

    const name = document.getElementById("signupName")?.value.trim() || "";
    const email = document.getElementById("signupEmail")?.value.trim() || "";
    const password = document.getElementById("signupPassword")?.value || "";

    if (!name || !email || !password) {
      showToast("Name, email and password are required.", "error");
      return;
    }

    if (password.length < 6) {
      showToast("Password should be at least 6 characters.", "error");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserProfile(userCredential.user.uid, name, email);
      showToast("Account created successfully.", "success");
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Signup error:", error);
      const message = error.code ? mapAuthError(error.code) : error.message || "Unable to create account. Please try again.";
      showToast(message, "error");
    }
  });
}

window.addEventListener("load", initSignupPage);
