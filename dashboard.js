import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initDashboardPage, getSavedData, setAuthUI, state, showToast, renderDashboard } from "./script.js";

function getFallbackName(user) {
  if (user?.email) {
    return user.email.split("@")[0];
  }
  return "User";
}

function updateProfileUI(userData, user) {
  const userNameEl = document.getElementById("userName");
  const userEmailEl = document.getElementById("userEmail");
  const userAvatarEl = document.getElementById("userAvatar");

  const name = userData?.name || getFallbackName(user);
  const email = user.email || userData?.email || "";

  if (userNameEl) userNameEl.textContent = name;
  if (userEmailEl) userEmailEl.textContent = email;
  if (userAvatarEl) {
    userAvatarEl.style.backgroundImage = "";
    userAvatarEl.textContent = name.charAt(0).toUpperCase();
  }
}

async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data();
  }

  const fallback = {
    name: getFallbackName(user),
    email: user.email || ""
  };

  await setDoc(userRef, fallback);
  return fallback;
}

function attachDashboardLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.replaceWith(logoutBtn.cloneNode(true));
  const freshLogout = document.getElementById("logoutBtn");
  if (!freshLogout) return;

  freshLogout.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

window.dashboardLogout = async function() {
  await signOut(auth);
  window.location.href = "login.html";
};

async function handleDashboardUser(user) {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  state.user = user;
  state.data = getSavedData(user.uid);
  setAuthUI(user);
  attachDashboardLogout();

  try {
    const profile = await ensureUserProfile(user);
    updateProfileUI(profile, user);
  } catch (error) {
    console.error("Error loading profile:", error);
    showToast("Unable to load profile data.", "error");
  }

  initDashboardPage();
  renderDashboard();
}

window.addEventListener("load", () => {
  const current = auth.currentUser;
  if (current) {
    handleDashboardUser(current);
    return;
  }

  onAuthStateChanged(auth, (user) => {
    handleDashboardUser(user);
  });
});
