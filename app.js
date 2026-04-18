/* ===========
  Small helpers
=========== */
const $ = (id) => document.getElementById(id);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

const LS = {
  theme: "hs_theme",
  notes: "hs_notes"
};

function setTheme(mode) {
  if (mode === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem(LS.theme, mode);
  const btn = $("themeBtn");
  if (btn) btn.textContent = mode === "dark" ? "🌙" : "☀️";
}

function initTheme() {
  const t = localStorage.getItem(LS.theme) || "light";
  setTheme(t);
}

function showAuth() {
  $("authScreen").classList.remove("hidden");
  $("appShell").classList.add("hidden");
}

function showApp() {
  $("authScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
}

function setMsg(el, text, good = true) {
  el.textContent = text || "";
  el.style.opacity = text ? "1" : "0.9";
  el.style.color = good ? "#ffffff" : "#ffe4e6";
}

function fmtDateTime(dt) {
  try { return new Date(dt).toLocaleString("en-PK"); }
  catch { return String(dt); }
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}

/* ===========
  Auth UI
=========== */
function setAuthTab(which) {
  $("tabLogin").classList.toggle("active", which === "login");
  $("tabSignup").classList.toggle("active", which === "signup");
  $("loginForm").classList.toggle("hidden", which !== "login");
  $("signupForm").classList.toggle("hidden", which !== "signup");
  $("loginMsg").textContent = "";
  $("signupMsg").textContent = "";
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  const msg = $("loginMsg");
  setMsg(msg, "Logging in...", true);

  const { error } = await signIn(email, password);
  if (error) {
    setMsg(msg, error.message || "Login failed.", false);
    return;
  }
  setMsg(msg, "Login successful.", true);
}

async function handleSignup(e) {
  e.preventDefault();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;

  const msg = $("signupMsg");
  setMsg(msg, "Creating account...", true);

  const { error } = await signUp(email, password);
  if (error) {
    setMsg(msg, error.message || "Sign up failed.", false);
    return;
  }

  // If email confirmation is ON, user must confirm email.
  setMsg(msg, "Sign up successful. Check your email for verification if required.", true);
}

async function handleForgot() {
  const email = $("loginEmail").value.trim();
  const msg = $("loginMsg");
  if (!email) return setMsg(msg, "Enter your email first.", false);

  setMsg(msg, "Sending password reset email...", true);
  const { error } = await resetPassword(email);
  if (error) return setMsg(msg, error.message || "Reset failed.", false);
  setMsg(msg, "Password reset email sent (if email is valid).", true);
}

/* ===========
  Navigation
=========== */
function goPage(page) {
  qsa(".page").forEach(p => p.classList.remove("active"));
  qsa(".nav").forEach(b => b.classList.remove("active"));
  qsa(".bnav").forEach(b => b.classList.remove("active"));

  const sec = $("page-" + page);
  if (sec) sec.classList.add("active");

  qsa(`[data-page="${page}"]`).forEach(b => b.classList.add("active"));
}

/* ===========
  Dashboard rendering
=========== */
function setOccupancy(occupied, total) {
  const pct = total ? Math.round((occupied / total) * 100) : 0;
  $("occPct").textContent = pct + "%";
  $("occFill").style.width = pct + "%";
  $("occText").textContent = total ? (pct + "% Occupied") : "No rooms configured yet";
  $("occLine").textContent = `Occupied: ${occupied} / Total: ${total}`;
}

function renderAvailToday(currentStays) {
  const { start, end } = todayRange();
  const list = $("availTodayList");
  list.innerHTML = "";

  const today = (currentStays || []).filter(s => {
    const t = new Date(s.expected_checkout_at).getTime();
    return t >= start && t < end;
  });

  if (!today.length) {
    list.innerHTML = `<div class="empty">No checkouts scheduled for today</div>`;
    return;
  }

  today.forEach(s => {
    const room = s.rooms?.room_number || "";
    const guest = s.guests?.name || "";
    const checkoutText = fmtDateTime(s.expected_checkout_at);

    list.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div><b>Room ${room}</b> — ${guest}</div>
        <div class="small">Checkout: ${checkoutText}</div>
        <div class="row-between" style="margin-top:8px">
          <div class="small" data-countdown="${s.expected_checkout_at}">Available in ...</div>
          <span class="badge badge-over" data-overdue-badge style="display:none">OVERSTAY ALERT</span>
        </div>
      </div>
    `);
  });

  updateCountdowns();
}

function updateCountdowns() {
  qsa("[data-countdown]").forEach(el => {
    const when = new Date(el.getAttribute("data-countdown")).getTime();
    const diff = when - Date.now();
    const badge = el.parentElement.querySelector("[data-overdue-badge]");

    if (diff <= 0) {
      const mins = Math.floor(Math.abs(diff) / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      el.textContent = `Overdue by ${h}h ${m}m`;
      badge.style.display = "inline-block";
      return;
    }

    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    el.textContent = `Available in ${h}h ${m}m`;
    badge.style.display = "none";
  });
}

/* ===========
  Quick Notes
=========== */
function initNotes() {
  const area = $("quickNotes");
  if (!area) return;

  area.value = localStorage.getItem(LS.notes) || "";
  area.addEventListener("input", () => {
    localStorage.setItem(LS.notes, area.value);
  });
}

/* ===========
  Load core data
=========== */
async function refreshDashboard() {
  const roomsRes = await listRooms();
  const staysRes = await listCurrentStays();

  const rooms = roomsRes.data || [];
  const stays = staysRes.data || [];

  const available = rooms.filter(r => r.status === "Available").length;
  const occupied = rooms.filter(r => r.status === "Occupied").length;
  const cleaning = rooms.filter(r => r.status === "Cleaning").length;
  const maint = rooms.filter(r => r.status === "Maintenance").length;

  $("dAvail").textContent = String(available);
  $("dOcc").textContent = String(occupied);
  $("dClean").textContent = String(cleaning);
  $("dMaint").textContent = String(maint);

  setOccupancy(occupied, rooms.length);
  renderAvailToday(stays);
}

/* ===========
  Session handling
=========== */
async function handleSessionChange() {
  const { data } = await db.auth.getSession();
  const session = data?.session;

  if (!session) {
    showAuth();
    return;
  }

  showApp();
  initNotes();
  await refreshDashboard();
  // update countdowns every minute
  clearInterval(window.__hsTimer);
  window.__hsTimer = setInterval(updateCountdowns, 60000);
}

/* ===========
  Wire events
=========== */
function wireEvents() {
  // Auth tabs
  $("tabLogin").addEventListener("click", () => setAuthTab("login"));
  $("tabSignup").addEventListener("click", () => setAuthTab("signup"));

  // Forms
  $("loginForm").addEventListener("submit", handleLogin);
  $("signupForm").addEventListener("submit", handleSignup);
  $("forgotBtn").addEventListener("click", handleForgot);

  // Theme
  const themeBtn = $("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const cur = localStorage.getItem(LS.theme) || "light";
      setTheme(cur === "light" ? "dark" : "light");
    });
  }

  // Logout
  $("logoutBtn").addEventListener("click", async () => {
    await signOut();
  });

  // Navigation
  qsa(".nav").forEach(btn => btn.addEventListener("click", () => goPage(btn.dataset.page)));
  qsa(".bnav").forEach(btn => btn.addEventListener("click", () => goPage(btn.dataset.page)));
}

/* ===========
  Init
=========== */
(function init() {
  initTheme();
  setAuthTab("login");
  wireEvents();

  // Listen to auth changes
  db.auth.onAuthStateChange(() => {
    handleSessionChange();
  });

  // First load
  handleSessionChange();
})();
