import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many login attempts. Try again later.";
    default:
      return "Unable to login. Please check your email and password.";
  }
}

function initLoginPage() {
  console.log("login.js loaded");
  const submitLogin = document.getElementById("submitLogin");
  if (!submitLogin) {
    console.error("Login button not found on page.");
    showToast("Login page failed to load properly.", "error");
    return;
  }

  submitLogin.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password = document.getElementById("loginPassword")?.value || "";

    if (!email || !password) {
      showToast("Email and password are required.", "error");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Login successful.", "success");
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Login error:", error);
      const message = error.code ? mapAuthError(error.code) : error.message || "Unable to login. Please try again.";
      showToast(message, "error");
    }
  });
}

window.addEventListener("load", initLoginPage);
