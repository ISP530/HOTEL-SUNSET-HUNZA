/* ================================================
   HOTEL SUNSET — app.js
   No manual changes needed here.
   All config is in db.js
================================================ */

const $ = id => document.getElementById(id);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const fmtPKR = n => "PKR " + Number(n || 0).toLocaleString("en-PK");
const LS = { theme: "hs_theme", notes: "hs_notes" };

/* ---- THEME ---- */
function setTheme(mode) {
  if (mode === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem(LS.theme, mode);
  const btn = $("themeBtn");
  if (btn) btn.textContent = mode === "dark" ? "🌙" : "☀️";
}
function initTheme() { setTheme(localStorage.getItem(LS.theme) || "light"); }

/* ---- AUTH UI ---- */
function showAuth() {
  $("authScreen").classList.remove("hidden");
  $("appShell").classList.add("hidden");
}
function showApp() {
  $("authScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
}
function setAuthTab(which) {
  $("tabLogin").classList.toggle("active", which === "login");
  $("tabSignup").classList.toggle("active", which === "signup");
  $("loginForm").classList.toggle("hidden", which !== "login");
  $("signupForm").classList.toggle("hidden", which !== "signup");
}
async function handleLogin(e) {
  e.preventDefault();
  const msg = $("loginMsg");
  msg.textContent = "Logging in...";
  const { error } = await signIn($("loginEmail").value.trim(), $("loginPassword").value);
  if (error) { msg.textContent = error.message || "Login failed."; return; }
  msg.textContent = "";
}
async function handleSignup(e) {
  e.preventDefault();
  const msg = $("signupMsg");
  msg.textContent = "Creating account...";
  const { error } = await signUp($("signupEmail").value.trim(), $("signupPassword").value);
  if (error) { msg.textContent = error.message || "Sign up failed."; return; }
  msg.textContent = "Sign up successful. Check your email for verification if required.";
}
async function handleForgot() {
  const email = $("loginEmail").value.trim();
  const msg = $("loginMsg");
  if (!email) { msg.textContent = "Enter your email first."; return; }
  msg.textContent = "Sending reset email...";
  const { error } = await resetPassword(email);
  msg.textContent = error ? (error.message || "Reset failed.") : "Password reset email sent.";
}

/* ---- NAVIGATION ---- */
function goPage(page) {
  qsa(".page").forEach(p => p.classList.remove("active"));
  qsa(".nav, .bnav").forEach(b => b.classList.remove("active"));
  const sec = $("page-" + page);
  if (sec) sec.classList.add("active");
  qsa(`[data-page="${page}"]`).forEach(b => b.classList.add("active"));
  if (page === "rooms") refreshRooms();
  if (page === "guests") refreshGuests();
  if (page === "finance") refreshFinance();
  if (page === "staff") refreshStaff();
  if (page === "billing") refreshBilling();
  if (page === "maintenance") refreshMaintenance();
  if (page === "archive") refreshArchive();
  if (page === "settings") loadSettings();
}
function goTab(tabId) {
  const parent = document.querySelector(`[data-tab="${tabId}"]`)?.closest(".page") || document;
  parent.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
  document.querySelectorAll(".tabpane").forEach(p => p.classList.toggle("active", p.id === "tab-" + tabId));
}

/* ---- DASHBOARD ---- */
async function refreshDashboard() {
  const [roomsRes, staysRes, revToday, expToday] = await Promise.all([
    listRooms(), listCurrentStays(), sumRevenue("today"), sumExpenses("today")
  ]);
  const rooms = roomsRes.data || [];
  const stays = staysRes.data || [];

  $("dAvail").textContent = rooms.filter(r => r.status === "Available").length;
  $("dOcc").textContent = rooms.filter(r => r.status === "Occupied").length;
  $("dClean").textContent = rooms.filter(r => r.status === "Cleaning").length;
  $("dMaint").textContent = rooms.filter(r => r.status === "Maintenance").length;

  const occupied = rooms.filter(r => r.status === "Occupied").length;
  const total = rooms.length;
  const pct = total ? Math.round((occupied / total) * 100) : 0;
  $("occPct").textContent = pct + "%";
  $("occFill").style.width = pct + "%";
  $("occText").textContent = total ? (pct + "% Occupied") : "No rooms configured yet";
  $("occLine").textContent = `Occupied: ${occupied} / Total: ${total}`;

  const profit = revToday - expToday;
  $("dRevenue").textContent = fmtPKR(revToday);
  $("dExpenses").textContent = fmtPKR(expToday);
  $("dProfit").textContent = fmtPKR(profit);
  $("dProfit").className = "v " + (profit >= 0 ? "green" : "red");

  const [revWeek, expWeek, revMonth, expMonth, revYear, expYear] = await Promise.all([
    sumRevenue("week"), sumExpenses("week"),
    sumRevenue("month"), sumExpenses("month"),
    sumRevenue("year"), sumExpenses("year")
  ]);
  $("pnlDaily").textContent = fmtPKR(revToday - expToday);
  $("pnlWeekly").textContent = fmtPKR(revWeek - expWeek);
  $("pnlMonthly").textContent = fmtPKR(revMonth - expMonth);
  $("pnlYearly").textContent = fmtPKR(revYear - expYear);

  renderAvailToday(stays);

  const notes = localStorage.getItem(LS.notes) || "";
  $("quickNotes").value = notes;
  $("quickNotes").oninput = () => localStorage.setItem(LS.notes, $("quickNotes").value);
}

function renderAvailToday(stays) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;
  const list = $("availTodayList");
  list.innerHTML = "";
  const today = stays.filter(s => {
    const t = new Date(s.expected_checkout_at).getTime();
    return t >= start && t < end;
  });
  if (!today.length) { list.innerHTML = `<div class="empty">No checkouts scheduled for today</div>`; return; }
  today.forEach(s => {
    list.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div><b>Room ${s.rooms?.room_number || s.room_number || ""}</b> — ${s.guests?.name || s.guest_name || ""}</div>
        <div class="small">Checkout: ${new Date(s.expected_checkout_at).toLocaleString("en-PK")}</div>
        <div style="margin-top:6px;display:flex;align-items:center;gap:10px">
          <span class="small" data-countdown="${s.expected_checkout_at}">...</span>
          <span class="badge badge-over" data-overdue-badge style="display:none">OVERSTAY ALERT</span>
        </div>
      </div>`);
  });
  updateCountdowns();
}

function updateCountdowns() {
  qsa("[data-countdown]").forEach(el => {
    const when = new Date(el.getAttribute("data-countdown")).getTime();
    const diff = when - Date.now();
    const badge = el.parentElement.querySelector("[data-overdue-badge]");
    if (diff <= 0) {
      const h = Math.floor(Math.abs(diff) / 3600000);
      const m = Math.floor((Math.abs(diff) % 3600000) / 60000);
      el.textContent = `Overdue by ${h}h ${m}m`;
      if (badge) badge.style.display = "inline-block";
    } else {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      el.textContent = `Available in ${h}h ${m}m`;
      if (badge) badge.style.display = "none";
    }
  });
}

function resetPnl(period) {
  if (!confirm(`Reset ${period} P&L display? Your data on the Finance page will NOT be affected.`)) return;
  const ids = { daily: "pnlDaily", weekly: "pnlWeekly", monthly: "pnlMonthly", yearly: "pnlYearly" };
  if (ids[period]) $(ids[period]).textContent = "PKR 0";
}

/* ---- ROOMS ---- */
async function refreshRooms() {
  const res = await listRooms();
  const rooms = res.data || [];
  const list = $("roomsList");
  list.innerHTML = "";
  if (!rooms.length) { list.innerHTML = `<div class="empty">No records found</div>`; fillRoomDropdown([]); return; }
  rooms.forEach(r => {
    list.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div class="row-between">
          <div><b>Room ${r.room_number}</b> — ${r.room_type_name || ""}</div>
          <div class="small">${fmtPKR(r.rate_per_night)}/night</div>
        </div>
        <div class="small" style="margin-top:4px">Status: <b>${r.status}</b></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          ${["Available","Occupied","Cleaning","Maintenance","Blocked"].map(s =>
            `<button class="btn-reset" onclick="quickStatus('${r.id}','${s}')">${s}</button>`
          ).join("")}
        </div>
      </div>`);
  });
  fillRoomDropdown(rooms.filter(r => r.status === "Available"));
}

async function quickStatus(id, status) {
  await updateRoom(id, { status });
  await refreshRooms();
  await refreshDashboard();
}

function fillRoomDropdown(availableRooms) {
  const sel = $("gRoom"); if (!sel) return;
  sel.innerHTML = availableRooms.length ? "" : `<option value="">No available rooms</option>`;
  availableRooms.forEach(r => {
    sel.insertAdjacentHTML("beforeend",
      `<option value="${r.id}" data-number="${r.room_number}" data-type="${r.room_type_name || ""}" data-rate="${r.rate_per_night}">Room ${r.room_number} — ${r.room_type_name || ""} — ${fmtPKR(r.rate_per_night)}/night</option>`);
  });
  if (sel.options.length) {
    const opt = sel.options[0];
    $("gRate").value = opt.dataset.rate || "";
  }
}

/* ---- GUESTS ---- */
async function refreshGuests() {
  const [cur, hist] = await Promise.all([listCurrentStays(), listGuestHistory()]);
  const curList = $("currentGuestsList");
  curList.innerHTML = "";
  if (!(cur.data || []).length) { curList.innerHTML = `<div class="empty">No guests currently staying. Check in a new guest to get started.</div>`; }
  else {
    (cur.data || []).forEach(s => {
      curList.insertAdjacentHTML("beforeend", `
        <div class="item">
          <div><b>${s.guests?.name || s.guest_name || ""}</b> — ${s.guests?.phone || s.guest_phone || ""}</div>
          <div class="small">Room ${s.rooms?.room_number || s.room_number || ""} | Checkout: ${new Date(s.expected_checkout_at).toLocaleString("en-PK")}</div>
          <div class="small" data-countdown="${s.expected_checkout_at}" style="margin-top:4px">...</div>
        </div>`);
    });
  }
  const histList = $("guestHistoryList");
  histList.innerHTML = "";
  if (!(hist.data || []).length) { histList.innerHTML = `<div class="empty">No past guests yet. Guest history will appear here after first checkout.</div>`; }
  else {
    (hist.data || []).forEach(s => {
      histList.insertAdjacentHTML("beforeend", `
        <div class="item">
          <div><b>${s.guests?.name || s.guest_name || ""}</b> — ${s.guests?.phone || s.guest_phone || ""}</div>
          <div class="small">Room ${s.rooms?.room_number || s.room_number || ""} | Check-in: ${new Date(s.checkin_at).toLocaleDateString("en-PK")} | Checkout: ${s.checkout_at ? new Date(s.checkout_at).toLocaleDateString("en-PK") : "Still staying"}</div>
          <div class="small">Advance Paid: ${fmtPKR(s.advance_paid)} | Method: ${s.payment_method}</div>
        </div>`);
    });
  }
  updateCountdowns();
}

async function handleCheckin() {
  const msg = $("checkinMsg");
  const roomSel = $("gRoom");
  const opt = roomSel.options[roomSel.selectedIndex];
  const payload = {
    name: $("gName").value.trim(),
    phone: $("gPhone").value.trim(),
    room_id: roomSel.value,
    room_number: opt?.dataset.number || "",
    room_type: opt?.dataset.type || "",
    rate_per_night: $("gRate").value,
    expected_checkout_at: $("gCheckout").value,
    advance_paid: $("gAdvance").value,
    payment_method: $("gPayMethod").value,
    num_adults: $("gAdults").value,
    num_children: $("gChildren").value,
    guest_type: $("gType").value || null,
    id_type: $("gIdType").value || null,
    id_number: $("gIdNo").value.trim() || null
  };
  if (!payload.name) { msg.textContent = "Guest Name is required."; return; }
  if (!payload.phone) { msg.textContent = "Phone Number is required."; return; }
  if (!payload.room_id) { msg.textContent = "No available rooms. Add rooms first."; return; }
  if (!payload.expected_checkout_at) { msg.textContent = "Expected Checkout Date & Time is required."; return; }

  msg.textContent = "Checking in...";
  const res = await checkIn(payload);
  if (res.error) { msg.textContent = "Error: " + (res.error.message || res.error); return; }

  if (res.returning) {
    $("returningGuestBanner").classList.remove("hidden");
    $("returningGuestBanner").textContent = `Returning Guest Detected! ${payload.name} has stayed before.`;
  }

  msg.textContent = `Guest checked in successfully! Room ${payload.room_number} is now occupied.`;
  await refreshRooms();
  await refreshDashboard();
  setTimeout(() => { msg.textContent = ""; $("returningGuestBanner").classList.add("hidden"); }, 4000);
}

/* ---- FINANCE ---- */
async function refreshFinance() {
  const [rt, rm, ry, ra] = await Promise.all([sumRevenue("today"), sumRevenue("month"), sumRevenue("year"), sumRevenue("alltime")]);
  $("fTodayRev").textContent = fmtPKR(rt);
  $("fMonthRev").textContent = fmtPKR(rm);
  $("fYearRev").textContent = fmtPKR(ry);
  $("fAllRev").textContent = fmtPKR(ra);

  const [et, em, ey, ea] = await Promise.all([sumExpenses("today"), sumExpenses("month"), sumExpenses("year"), sumExpenses("alltime")]);
  $("pnlDailyF").textContent = fmtPKR(rt - et);
  $("pnlWeeklyF").textContent = fmtPKR((await sumRevenue("week")) - (await sumExpenses("week")));
  $("pnlMonthlyF").textContent = fmtPKR(rm - em);
  $("pnlYearlyF").textContent = fmtPKR(ry - ey);
  $("pnlAllF").textContent = fmtPKR(ra - ea);

  ["pnlDailyF","pnlWeeklyF","pnlMonthlyF","pnlYearlyF","pnlAllF"].forEach(id => {
    const el = $(id); const v = parseFloat(el.textContent.replace(/[^0-9.-]/g,""));
    el.className = "v " + (v >= 0 ? "green" : "red");
  });

  const [revRows, expRows] = await Promise.all([listRevenue("month", null, null), listExpenses("month", null, null)]);
  const rl = $("revenueList");
  rl.innerHTML = "";
  if (!(revRows.data || []).length) { rl.innerHTML = `<div class="empty">No revenue records yet</div>`; }
  else {
    (revRows.data || []).forEach(r => {
      rl.insertAdjacentHTML("beforeend", `<div class="item"><div class="row-between"><b>${fmtPKR(r.amount)}</b><span class="small">${r.revenue_date || ""}</span></div><div class="small">${r.category} — ${r.description || ""}</div></div>`);
    });
  }
  const el = $("expenseList");
  el.innerHTML = "";
  if (!(expRows.data || []).length) { el.innerHTML = `<div class="empty">No expenses recorded yet</div>`; }
  else {
    (expRows.data || []).forEach(e => {
      el.insertAdjacentHTML("beforeend", `<div class="item"><div class="row-between"><b>${fmtPKR(e.amount)}</b><span class="small">${e.expense_date || ""}</span></div><div class="small">${e.category_name || ""} — ${e.description || ""}</div></div>`);
    });
  }
}

async function handleAddRevenue() {
  const msg = $("revMsg");
  const amount = parseFloat($("revAmount").value);
  if (!amount) { msg.textContent = "Amount is required."; return; }
  msg.textContent = "Saving...";
  const res = await addRevenue({
    amount, category: $("revCategory").value, description: $("revDesc").value.trim(),
    payment_method: $("revMethod").value, revenue_date: $("revDate").value || todayStr(), is_auto: false
  });
  msg.textContent = res.error ? "Error saving." : "Revenue added.";
  await refreshFinance();
  await refreshDashboard();
}

async function handleAddExpense() {
  const msg = $("expMsg");
  const amount = parseFloat($("expAmount").value);
  if (!amount) { msg.textContent = "Amount is required."; return; }
  msg.textContent = "Saving...";
  const res = await addExpense({
    amount, category_name: $("expCategory").value.trim(), description: $("expDesc").value.trim(),
    paid_to: $("expPaidTo").value.trim(), payment_method: $("expMethod").value,
    expense_date: $("expDate").value || todayStr()
  });
  msg.textContent = res.error ? "Error saving." : "Expense saved.";
  await refreshFinance();
  await refreshDashboard();
}

/* ---- BILLING ---- */
async function refreshBilling() {
  $("pendingPaymentsList").innerHTML = `<div class="empty">No pending payments</div>`;
  $("billingHistoryList").innerHTML = `<div class="empty">No billing history yet</div>`;
}

/* ---- MAINTENANCE ---- */
async function refreshMaintenance() {
  const res = await listMaintenance("all");
  const items = res.data || [];
  const active = items.filter(i => i.status !== "Completed");
  const history = items.filter(i => i.status === "Completed");

  const al = $("maintActiveList");
  al.innerHTML = active.length ? "" : `<div class="empty">No active issues</div>`;
  active.sort((a, b) => {
    const order = { Urgent: 0, Medium: 1, Low: 2 };
    return (order[a.priority] || 1) - (order[b.priority] || 1);
  });
  active.forEach(m => {
    const badgeCls = m.priority === "Urgent" ? "badge-red" : m.priority === "Medium" ? "badge-amber" : "badge-green";
    al.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div class="row-between">
          <span class="badge ${badgeCls}">${m.priority}</span>
          <span class="small">${m.category}</span>
        </div>
        <div style="margin-top:4px"><b>${m.area || ""}</b> — ${m.description || ""}</div>
        <div class="small">Estimated: ${fmtPKR(m.estimated_cost)}</div>
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn-reset" onclick="markMaintPaid('${m.id}',${m.estimated_cost})">Mark as Paid</button>
          <button class="btn-reset" onclick="markMaintComplete('${m.id}')">Confirm Complete</button>
        </div>
      </div>`);
  });

  const hl = $("maintHistoryList");
  hl.innerHTML = history.length ? "" : `<div class="empty">No maintenance history yet</div>`;
  history.forEach(m => {
    hl.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div><b>${m.area || ""}</b> — ${m.category}</div>
        <div class="small">${m.description || ""}</div>
        <div class="small">Cost: ${fmtPKR(m.actual_cost || m.estimated_cost)}</div>
      </div>`);
  });

  const yearCost = items.filter(i => i.is_paid).reduce((s, i) => s + Number(i.actual_cost || 0), 0);
  $("maintCostYear").textContent = fmtPKR(yearCost);
}

async function markMaintPaid(id, est) {
  const cost = prompt(`Actual cost (PKR)? (Estimated: ${est})`, est || 0);
  if (cost === null) return;
  await updateMaintenance(id, { is_paid: true, actual_cost: Number(cost), status: "In Progress" });
  await addExpense({ amount: Number(cost), category_name: "Maintenance", description: "Maintenance repair", expense_date: todayStr() });
  await refreshMaintenance();
  await refreshDashboard();
}

async function markMaintComplete(id) {
  if (!confirm("Mark this issue as fully resolved?")) return;
  await updateMaintenance(id, { status: "Completed", completed_date: todayStr() });
  await refreshMaintenance();
}

/* ---- STAFF ---- */
async function refreshStaff() {
  const res = await listStaff();
  const members = res.data || [];
  $("staffCount").textContent = members.length;
  const total = members.reduce((s, m) => s + Number(m.monthly_salary || 0), 0);
  $("staffMonthlyCost").textContent = fmtPKR(total);
  const list = $("staffList");
  list.innerHTML = members.length ? "" : `<div class="empty">No staff added yet</div>`;
  members.forEach(m => {
    list.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div class="row-between"><b>${m.full_name}</b><span class="small">${m.role_position || ""}</span></div>
        <div class="small">${m.phone || ""} | Salary: ${fmtPKR(m.monthly_salary)} | Pay day: ${m.salary_payment_day}</div>
      </div>`);
  });
}

/* ---- ARCHIVE ---- */
async function refreshArchive() {
  const [gH, eH, rH, mH, sH] = await Promise.all([
    listGuestHistory(), listExpenses("alltime"), listRevenue("alltime"), listMaintenance("all"), listStaff()
  ]);

  const gl = $("archGuestList");
  gl.innerHTML = "";
  (gH.data || []).length ? (gH.data || []).forEach(s => 
