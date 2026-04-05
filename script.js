import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const STORAGE_PREFIX = "lifeease_data_";
const DEFAULT_DATA = {
  expenses: [],
  investments: [],
  subscriptions: [],
  goals: [],
  water: 0,
  steps: 0,
  sleep: 0,
  exercises: []
};

export const state = { user: null, data: null, charts: {} };

export function showToast(message, type = "success") {
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

function getStorageKey(uid) {
  return STORAGE_PREFIX + uid;
}

export function getSavedData(uid) {
  const raw = localStorage.getItem(getStorageKey(uid));
  if (!raw) return structuredClone(DEFAULT_DATA);
  try {
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_DATA), ...parsed };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function persistData() {
  if (!state.user) return;
  localStorage.setItem(getStorageKey(state.user.uid), JSON.stringify(state.data));
}

function ensureAuth() {
  if (!state.user) {
    showToast("Please login first", "error");
    setTimeout(() => window.location.href = "login.html", 600);
    return false;
  }
  return true;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export async function checkAuthRedirect(defaultPage = "login.html") {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = defaultPage;
      } else {
        state.user = user;
        state.data = getSavedData(user.uid);
        setAuthUI(user);
      }
      unsubscribe();
      resolve(user);
    });
  });
}

function setAuthUI(user) {
  const profile = document.getElementById("userProfile");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userAvatar = document.getElementById("userAvatar");
  const logoutBtn = document.getElementById("logoutBtn");

  const name = user.displayName || user.email || "User";
  const email = user.email || "";

  if (profile) profile.style.display = "flex";
  if (userName) userName.textContent = name;
  if (userEmail) userEmail.textContent = email;

  if (userAvatar) {
    userAvatar.style.backgroundColor = "rgba(255,255,255,0.15)";
    userAvatar.style.color = "var(--text)";
    userAvatar.style.display = "inline-flex";
    userAvatar.style.alignItems = "center";
    userAvatar.style.justifyContent = "center";
    userAvatar.style.borderRadius = "50%";
    userAvatar.style.fontWeight = "700";
    userAvatar.style.width = "34px";
    userAvatar.style.height = "34px";
    userAvatar.style.fontSize = "0.85rem";
    if (user.photoURL) {
      userAvatar.textContent = "";
      userAvatar.style.backgroundImage = `url('${user.photoURL}')`;
      userAvatar.style.backgroundSize = "cover";
      userAvatar.style.backgroundPosition = "center";
    } else {
      userAvatar.style.backgroundImage = "";
      userAvatar.textContent = name.charAt(0).toUpperCase();
    }
  }

  if (logoutBtn) {
    logoutBtn.replaceWith(logoutBtn.cloneNode(true));
    const freshLogout = document.getElementById("logoutBtn");
    freshLogout.addEventListener("click", async () => {
      await signOut(auth);
      showToast("Logged out", "success");
      localStorage.removeItem("lifeease-theme");
      window.location.href = "index.html";
    });
  }
}

window.dashboardLogout = async function() {
  await signOut(auth);
  showToast("Logged out", "success");
  localStorage.removeItem("lifeease-theme");
  window.location.href = "index.html";
};

export function setHeaderNav(page) {
  const nav = document.querySelector(".nav-links");
  if (!nav) return;
  nav.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("data-page") === page) link.classList.add("active");
  });
}

export function initThemeToggle() {
  const toggle = document.getElementById("themeToggle") || document.getElementById("toggleTheme");
  if (!toggle) return;

  const saved = localStorage.getItem("lifeease-theme");
  if (saved === "light") {
    document.body.classList.add("light-mode");
  } else if (saved === "dark") {
    document.body.classList.remove("light-mode");
  }

  toggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light-mode");
    localStorage.setItem("lifeease-theme", isLight ? "light" : "dark");
    showToast(`Switching to ${isLight ? "light" : "dark"} mode`, "success");
    document.body.style.transition = "background 0.3s ease, color 0.3s ease";
  });
}

export function exportToCSV(rows, filename = "data.csv") {
  if (!rows.length) return;
  const csvContent = [Object.keys(rows[0]).join(","), ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function addExpenseBase({ amount, category, subCategory, date, mode }) {
  if (!amount || !category || !date) {
    showToast("Please fill amount, category and date", "error");
    return false;
  }
  state.data.expenses.push({ amount: Number(amount).toFixed(2), category, subCategory, date, mode });
  persistData();
  renderWealth();
  showToast("Expense added", "success");
  return true;
}

function addGoalBase(goalName, targetAmount) {
  if (!goalName || !targetAmount) {
    showToast("Goal and amount required", "error");
    return false;
  }
  state.data.goals.push({ name: goalName, target: Number(targetAmount).toFixed(2), saved: 0 });
  persistData();
  renderWealth();
  showToast("Goal added", "success");
  return true;
}

export function initDashboardPage() {
  setHeaderNav("dashboard");
  initThemeToggle();
  renderDashboard();
}

function renderWealth() {
  if (!state.user || !state.data) return;
  setHeaderNav("wealth");
  initThemeToggle();

  const balance_el = document.getElementById("balance");
  const spend_el = document.getElementById("monthlySpend");
  const invest_el = document.getElementById("investValue");
  const progress_el = document.getElementById("goalProgress");

  const expenseTotal = state.data.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const investmentTotal = state.data.investments.reduce((sum, item) => sum + Number(item.amount), 0);
  const savedTotal = state.data.goals.reduce((sum, item) => sum + Number(item.saved || 0), 0);
  const targetTotal = state.data.goals.reduce((sum, item) => sum + Number(item.target || 0), 0);
  const progress = targetTotal ? Math.min(100, Math.round((savedTotal / targetTotal) * 100)) : 0;

  if (balance_el) balance_el.innerText = formatCurrency(investmentTotal - expenseTotal);
  if (spend_el) spend_el.innerText = formatCurrency(expenseTotal);
  if (invest_el) invest_el.innerText = formatCurrency(investmentTotal);
  if (progress_el) progress_el.innerText = `${progress}%`;

  const expenseBody = document.getElementById("expenseTable");
  if (expenseBody) {
    expenseBody.innerHTML = "";
    if (!state.data.expenses.length) {
      expenseBody.innerHTML = `<tr><td colspan="7" class="small-text">No expenses yet.</td></tr>`;
    }
    state.data.expenses.forEach((expense, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${expense.date || "-"}</td>
        <td>${expense.category || "-"}</td>
        <td>${expense.subCategory || "-"}</td>
        <td>${expense.mode || "-"}</td>
        <td>${formatCurrency(expense.amount)}</td>
        <td><button class="btn" onclick="window.deleteExpense(${index})">Del</button></td>
      `;
      expenseBody.appendChild(row);
    });
  }

  const investList = document.getElementById("investList");
  if (investList) {
    investList.innerHTML = "";
    if (!state.data.investments.length) {
      investList.innerHTML = `<li class="small-text">No investments yet.</li>`;
    }
    state.data.investments.forEach((item, index) => {
      const li = document.createElement("li");
      li.innerHTML = `${item.name} - ${formatCurrency(item.amount)} (${item.type}) <button class="btn" onclick="window.deleteInvestment(${index})">Del</button>`;
      investList.appendChild(li);
    });
  }

  const subTable = document.getElementById("subTable");
  if (subTable) {
    subTable.innerHTML = "";
    if (!state.data.subscriptions.length) {
      subTable.innerHTML = `<tr><td colspan="5" class="small-text">No subscriptions yet.</td></tr>`;
    }
    state.data.subscriptions.forEach((item) => {
      const dueDate = new Date(item.nextDue);
      const status = Date.now() > dueDate.getTime() ? "Overdue" : "Upcoming";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.platform}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td>${item.cycle}</td>
        <td>${item.nextDue}</td>
        <td>${status}</td>
      `;
      subTable.appendChild(row);
    });
  }

  const goalList = document.getElementById("goalList");
  if (goalList) {
    goalList.innerHTML = "";
    if (!state.data.goals.length) {
      goalList.innerHTML = `<li class="small-text">No goals yet.</li>`;
    }
    state.data.goals.forEach((goal, index) => {
      const completion = goal.target ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
      const li = document.createElement("li");
      li.className = "card";
      li.innerHTML = `
        <strong>${goal.name}</strong><br>
        Target: ${formatCurrency(goal.target)} - Saved: ${formatCurrency(goal.saved || 0)}<br>
        <progress value="${completion}" max="100" style="width:100%"></progress> ${completion}%<br>
        <button class="btn" onclick="window.saveGoalProgress(${index})">Save Progress</button>
      `;
      goalList.appendChild(li);
    });
  }

  const chartLabels = state.data.expenses.length ? state.data.expenses.map(e => e.category || "Other") : ["No data"];
  const chartData = state.data.expenses.length ? state.data.expenses.map(e => Number(e.amount)) : [1];
  buildChart("pieChart", "doughnut", chartLabels, chartData, ["#f59e0b", "#22c55e", "#3b82f6", "#a855f7"]);

  const monthly = Array(12).fill(0);
  state.data.expenses.forEach((expense) => {
    const d = new Date(expense.date);
    if (!isNaN(d)) monthly[d.getMonth()] += Number(expense.amount);
  });
  buildChart("barChart", "bar", ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], monthly, "#38bdf8");
}

export function renderDashboard() {
  if (!state.user || !state.data) return;
  setHeaderNav("dashboard");
  initThemeToggle();

  const balanceEl = document.getElementById("accountBalance");
  const monthSpendEl = document.getElementById("monthlySpending");
  const investEl = document.getElementById("investmentValue");
  const healthScoreEl = document.getElementById("healthScore");

  const expenseTotal = state.data.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const investTotal = state.data.investments.reduce((sum, item) => sum + Number(item.amount), 0);
  const healthScore = Math.round(((Number(state.data.water) / 3) + (Number(state.data.steps) / 10000) + (Number(state.data.sleep) / 8) + (state.data.exercises.length / 5)) * 12);

  if (balanceEl) balanceEl.innerText = formatCurrency(investTotal - expenseTotal);
  if (monthSpendEl) monthSpendEl.innerText = formatCurrency(expenseTotal);
  if (investEl) investEl.innerText = formatCurrency(investTotal);
  if (healthScoreEl) healthScoreEl.innerText = `${Math.min(100, healthScore)} / 100`;

  // Recent Transactions
  const recentDiv = document.getElementById("recentTransactions");
  if (recentDiv) {
    recentDiv.innerHTML = "";
    const recent = state.data.expenses.slice(-3);
    if (!recent.length) {
      recentDiv.innerHTML = "<p class='small-text'>No recent transactions.</p>";
    } else {
      recent.forEach(exp => {
        const item = document.createElement("div");
        item.className = "card";
        item.innerHTML = `<strong>${exp.category}</strong> - ${formatCurrency(exp.amount)} on ${exp.date}`;
        recentDiv.appendChild(item);
      });
    }
  }

  // Charts
  const expenseLabels = state.data.expenses.length ? [...new Set(state.data.expenses.map(e => e.category))] : ["No data"];
  const expenseData = expenseLabels.map(cat => state.data.expenses.filter(e => e.category === cat).reduce((sum, e) => sum + Number(e.amount), 0));
  buildChart("expensePie", "doughnut", expenseLabels, expenseData, ["#f59e0b", "#22c55e", "#3b82f6", "#a855f7"]);

  const monthly = Array(12).fill(0);
  state.data.expenses.forEach((expense) => {
    const d = new Date(expense.date);
    if (!isNaN(d)) monthly[d.getMonth()] += Number(expense.amount);
  });
  buildChart("monthlyTrend", "bar", ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], monthly, "#38bdf8");
}

function buildChart(canvasId, type, labels, dataSet, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === "undefined") return;
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{ label: "", data: dataSet, backgroundColor: color, borderColor: color, borderWidth: 1 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

onAuthStateChanged(auth, (user) => {
  const page = document.body.dataset.page;
  if (user) {
    state.user = user;
    state.data = state.data || getSavedData(user.uid);
    setAuthUI(user);
    if (page === "wealth") renderWealth();
    if (page === "dashboard") renderDashboard();
    if (page === "health") renderHealth();
  } else {
    if (!["login", "signup", "index", "landing", "home"].includes(page)) {
      window.location.href = "login.html";
    }
  }
});

window.addExpense = function() {
  if (!ensureAuth()) return;
  const amount = document.getElementById("amount")?.value || "";
  const category = document.getElementById("category")?.value || "";
  const subCategory = document.getElementById("subCategory")?.value || "";
  const date = document.getElementById("date")?.value || "";
  const mode = document.getElementById("mode")?.value || "UPI";
  if (addExpenseBase({ amount, category, subCategory, date, mode })) {
    document.getElementById("amount").value = "";
    document.getElementById("category").value = "";
    document.getElementById("subCategory").value = "";
    document.getElementById("date").value = "";
    document.getElementById("mode").value = "UPI";
  }
};

window.editExpense = function(index) {
  const expense = state.data.expenses[index];
  if (!expense) return;
  const updated = prompt("Update amount", expense.amount);
  if (updated !== null) {
    expense.amount = Number(updated).toFixed(2);
    persistData();
    renderWealth();
  }
};

window.deleteExpense = function(index) {
  state.data.expenses.splice(index, 1);
  persistData();
  renderWealth();
};

window.addInvestment = function() {
  if (!ensureAuth()) return;
  const name = document.getElementById("assetName")?.value || "";
  const type = document.getElementById("investType")?.value || "Stocks";
  const amount = document.getElementById("investAmount")?.value || "";
  const returnPct = document.getElementById("returnPct")?.value || "0";
  if (!name || !amount) return showToast("Provide asset and amount", "error");
  state.data.investments.push({ name, type, amount: Number(amount).toFixed(2), returnPct: Number(returnPct).toFixed(2) });
  persistData();
  renderWealth();
  showToast("Investment added", "success");
};

window.deleteInvestment = function(index) {
  state.data.investments.splice(index, 1);
  persistData();
  renderWealth();
};

window.addSubscription = function() {
  if (!ensureAuth()) return;
  const platform = document.getElementById("platform")?.value || "";
  const amount = document.getElementById("subAmount")?.value || "";
  const cycle = document.getElementById("billingCycle")?.value || "Monthly";
  const nextDue = document.getElementById("dueDate")?.value || "";
  if (!platform || !amount || !nextDue) return showToast("Complete subscription fields", "error");
  state.data.subscriptions.push({ platform, amount: Number(amount).toFixed(2), cycle, nextDue });
  persistData();
  renderWealth();
  showToast("Subscription added", "success");
};

window.addGoal = function() {
  if (!ensureAuth()) return;
  const name = document.getElementById("goalName")?.value || "";
  const target = document.getElementById("goalAmount")?.value || "";
  if (!name || !target) return showToast("Complete goal fields", "error");
  state.data.goals.push({ name, target: Number(target).toFixed(2), saved: 0 });
  persistData();
  renderWealth();
  showToast("Goal added", "success");
};

window.saveGoalProgress = function(index) {
  const value = prompt("Enter saved amount");
  if (value === null) return;
  state.data.goals[index].saved = Number(value) || 0;
  persistData();
  renderWealth();
};

window.searchExpenses = function() {
  const search = document.getElementById("searchExpense")?.value.toLowerCase() || "";
  document.querySelectorAll("#expenseTable tr").forEach((row) => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(search) ? "table-row" : "none";
  });
};

window.filterExpense = function() {
  const date = document.getElementById("filterDate")?.value;
  const category = document.getElementById("filterCategory")?.value.toLowerCase() || "";
  document.querySelectorAll("#expenseTable tr").forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (!cells.length) return;
    const rowDate = cells[1]?.innerText || "";
    const rowCategory = cells[2]?.innerText.toLowerCase() || "";
    const matchesDate = !date || rowDate === date;
    const matchesCategory = !category || rowCategory.includes(category);
    row.style.display = matchesDate && matchesCategory ? "table-row" : "none";
  });
};

window.addWater = function() {
  if (!ensureAuth()) return;
  const amount = Number(document.getElementById("waterAmount")?.value || 0);
  if (!amount || amount <= 0) return showToast("Enter a valid water amount.", "error");
  state.data.water += amount;
  persistData();
  renderHealth();
  showToast("Water added.", "success");
};

window.addSteps = function() {
  if (!ensureAuth()) return;
  const steps = Number(document.getElementById("stepCount")?.value || 0);
  if (!steps || steps <= 0) return showToast("Enter a valid step count.", "error");
  state.data.steps += steps;
  persistData();
  renderHealth();
  showToast("Steps saved.", "success");
};

window.addSleep = function() {
  if (!ensureAuth()) return;
  const hours = Number(document.getElementById("sleepHours")?.value || 0);
  if (!hours || hours <= 0) return showToast("Enter valid sleep hours.", "error");
  state.data.sleep = hours;
  persistData();
  renderHealth();
  showToast("Sleep updated.", "success");
};

window.addExercise = function() {
  if (!ensureAuth()) return;
  const exercise = document.getElementById("exerciseName")?.value.trim() || "";
  const minutes = Number(document.getElementById("exerciseTime")?.value || 0);
  if (!exercise || !minutes || minutes <= 0) return showToast("Enter exercise and duration.", "error");
  state.data.exercises.push({ name: exercise, minutes });
  persistData();
  renderHealth();
  showToast("Exercise added.", "success");
};

window.calculateBMI = function() {
  const weight = Number(document.getElementById("bmiWeight")?.value || 0);
  const height = Number(document.getElementById("bmiHeight")?.value || 0);
  if (!weight || !height) return showToast("Enter weight and height to calculate BMI.", "error");
  const meters = height / 100;
  const bmi = weight / (meters * meters);
  document.getElementById("bmiResult").textContent = `BMI: ${bmi.toFixed(1)} (${bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"})`;
};

window.addExpenseFromDash = function() {
  if (!ensureAuth()) return;
  const amount = document.getElementById("dashAmount")?.value || "";
  const category = document.getElementById("dashCategory")?.value || "";
  const subCategory = document.getElementById("dashSubCategory")?.value || "";
  const date = document.getElementById("dashDate")?.value || "";
  const mode = document.getElementById("dashMode")?.value || "UPI";
  if (addExpenseBase({ amount, category, subCategory, date, mode })) {
    document.getElementById("dashAmount").value = "";
    document.getElementById("dashCategory").value = "";
    document.getElementById("dashSubCategory").value = "";
    document.getElementById("dashDate").value = "";
    document.getElementById("dashMode").value = "UPI";
    renderDashboard();
  }
};

window.addGoalFromDash = function() {
  if (!ensureAuth()) return;
  const name = document.getElementById("dashGoalName")?.value || "";
  const target = document.getElementById("dashGoalTarget")?.value || "";
  if (addGoalBase(name, target)) {
    document.getElementById("dashGoalName").value = "";
    document.getElementById("dashGoalTarget").value = "";
    renderDashboard();
  }
};

window.exportExpensesCsv = function() {
  exportToCSV(state.data.expenses);
};

function renderHealth() {
  if (!state.user || !state.data) return;
  setHeaderNav("health");
  initThemeToggle();

  const waterStat = document.getElementById("waterStat");
  const stepsStat = document.getElementById("stepsStat");
  const sleepStat = document.getElementById("sleepStat");
  const healthScore = document.getElementById("healthScore");
  const exerciseTable = document.getElementById("exerciseTable");
  const chartCanvas = document.getElementById("healthChart");

  const score = Math.round(((Number(state.data.water) * 5) + (Number(state.data.steps) / 2000) + (Number(state.data.sleep) * 7) + (state.data.exercises.length * 3)));
  const normalizedScore = Math.min(100, Math.max(0, score));

  if (waterStat) waterStat.innerText = `${state.data.water.toFixed(1)} L`;
  if (stepsStat) stepsStat.innerText = `${state.data.steps}`;
  if (sleepStat) sleepStat.innerText = `${state.data.sleep.toFixed(1)} hrs`;
  if (healthScore) healthScore.innerText = `${normalizedScore} / 100`;

  if (exerciseTable) {
    exerciseTable.innerHTML = "";
    if (!state.data.exercises.length) {
      exerciseTable.innerHTML = `<tr><td colspan="2" class="small-text">No exercises yet.</td></tr>`;
    } else {
      state.data.exercises.forEach((entry) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${entry.name}</td><td>${entry.minutes}</td>`;
        exerciseTable.appendChild(row);
      });
    }
  }

  if (chartCanvas && typeof Chart !== "undefined") {
    const labels = state.data.exercises.map((entry) => entry.name);
    const values = state.data.exercises.map((entry) => entry.minutes);
    if (state.charts.healthChart) state.charts.healthChart.destroy();
    state.charts.healthChart = new Chart(chartCanvas, {
      type: "bar",
      data: { labels, datasets: [{ label: "Minutes", data: values, backgroundColor: "#3b82f6" }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}
