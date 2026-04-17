const $ = (id) => document.getElementById(id);
const fmtPKR = (n) => "PKR " + Number(n || 0).toLocaleString("en-PK");
const LS = {
  theme: "hs_theme",
  auth: "hs_auth",
  authAt: "hs_auth_at",
  notes: "hs_notes",
};

function setTheme(mode) {
  if (mode === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem(LS.theme, mode);
  $("themeBtn").textContent = mode === "dark" ? "🌙" : "☀️";
}

function initTheme() {
  const t = localStorage.getItem(LS.theme) || "light";
  setTheme(t);
}

function daysSince(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(d);
}

function within7Days() {
  const at = Number(localStorage.getItem(LS.authAt) || 0);
  if (!at) return false;
  return (Date.now() - at) < 7 * 24 * 60 * 60 * 1000;
}

function lockApp(show) {
  $("passwordScreen").style.display = show ? "flex" : "none";
  $("app").style.display = show ? "none" : "block";
}

function checkPassword() {
  const entered = $("pwInput").value;
  if (entered === APP_PASSWORD) {
    localStorage.setItem(LS.auth, "true");
    localStorage.setItem(LS.authAt, String(Date.now()));
    $("pwError").style.display = "none";
    lockApp(false);
    boot();
  } else {
    $("pwError").style.display = "block";
    $("pwInput").value = "";
  }
}

function initAuth() {
  const ok = localStorage.getItem(LS.auth) === "true" && within7Days();
  lockApp(!ok);
  if (ok) boot();
}

function pageNav(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".bnav").forEach(b => b.classList.remove("active"));

  $("page-" + page).classList.add("active");
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add("active"));
}

function tabNav(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tabpane").forEach(p => p.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${name}"]`).classList.add("active");
  $("tab-" + name).classList.add("active");
}

/* =========================
   Render functions
========================= */
async function refreshDashboard() {
  const roomsRes = await listRooms();
  const staysRes = await listCurrentStays();

  const rooms = roomsRes.data || [];
  const stays = staysRes.data || [];

  const total = rooms.length;
  const occupied = rooms.filter(r => r.status === "Occupied").length;
  const cleaning = rooms.filter(r => r.status === "Cleaning").length;
  const maint = rooms.filter(r => r.status === "Maintenance").length;
  const available = rooms.filter(r => r.status === "Available").length;

  $("dAvail").textContent = String(available);
  $("dOcc").textContent = String(occupied);
  $("dClean").textContent = String(cleaning);
  $("dMaint").textContent = String(maint);

  const pct = total ? Math.round((occupied / total) * 100) : 0;
  $("occPct").textContent = pct + "%";
  $("occFill").style.width = pct + "%";
  $("occText").textContent = total ? (pct + "% Occupied") : "No rooms configured yet";
  $("occLine").textContent = `Occupied: ${occupied} / Total: ${total}`;

  // Rooms becoming available today (simple: stays with expected checkout today)
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000;

  const todayStays = stays.filter(s => {
    const t = new Date(s.expected_checkout_at).getTime();
    return t >= start && t < end;
  });

  const list = $("availTodayList");
  list.innerHTML = "";

  if (!todayStays.length) {
    list.innerHTML = `<div class="empty">No checkouts scheduled for today</div>`;
  } else {
    todayStays.forEach(s => {
      const checkout = new Date(s.expected_checkout_at).toLocaleString("en-PK");
      list.insertAdjacentHTML("beforeend", `
        <div class="item">
          <div><b>Room ${s.rooms?.room_number || ""}</b> — ${s.guests?.name || ""}</div>
          <div class="small">Checkout: ${checkout}</div>
          <div class="row-between" style="margin-top:8px">
            <div class="small" data-countdown="${s.expected_checkout_at}">Available in ...</div>
            <span class="badge" data-overdue-badge style="display:none">OVERSTAY ALERT</span>
          </div>
        </div>
      `);
    });
  }

  updateCountdowns();
}

function updateCountdowns() {
  document.querySelectorAll("[data-countdown]").forEach(el => {
    const when = new Date(el.getAttribute("data-countdown")).getTime();
    const diff = when - Date.now();
    const badge = el.parentElement.querySelector("[data-overdue-badge]");

    if (diff <= 0) {
      const mins = Math.floor(Math.abs(diff) / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      el.textContent = `Overdue by ${h}h ${m}m`;
      badge.style.display = "inline-block";
      badge.className = "badge badge-over";
      badge.textContent = "OVERSTAY ALERT";
      return;
    }

    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    el.textContent = `Available in ${h}h ${m}m`;
    badge.style.display = "none";
  });
}

async function refreshRooms() {
  const res = await listRooms();
  const rooms = res.data || [];
  const list = $("roomsList");
  list.innerHTML = "";

  if (!rooms.length) {
    list.innerHTML = `<div class="empty">No records found</div>`;
    return;
  }

  rooms.forEach(r => {
    list.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div class="row-between">
          <div><b>Room ${r.room_number}</b> — ${r.room_type || ""}</div>
          <div class="small">${fmtPKR(r.rate_per_night)} / night</div>
        </div>
        <div class="small" style="margin-top:6px">Status: <b>${r.status}</b></div>
        <div class="row-between" style="margin-top:10px;gap:10px">
          <select class="input" data-room-status="${r.id}" style="max-width:160px">
            ${["Available","Occupied","Cleaning","Maintenance","Blocked"].map(s => `<option ${s===r.status?"selected":""}>${s}</option>`).join("")}
          </select>
          <button class="btn" data-save-room="${r.id}" style="background:var(--bg);border:1px solid var(--border)">Save Status</button>
        </div>
      </div>
    `);
  });

  document.querySelectorAll("[data-save-room]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-save-room");
      const sel = document.querySelector(`[data-room-status="${id}"]`);
      await updateRoom(id, { status: sel.value });
      await refreshRooms();
      await refreshDashboard();
    };
  });

  // Fill rooms dropdown in check-in
  fillRoomDropdown(rooms.filter(r => r.status === "Available"));
}

function fillRoomDropdown(availableRooms) {
  const sel = $("gRoom");
  sel.innerHTML = "";
  if (!availableRooms.length) {
    sel.innerHTML = `<option value="">No available rooms</option>`;
    return;
  }
  availableRooms.forEach(r => {
    sel.insertAdjacentHTML("beforeend",
      `<option value="${r.id}">Room ${r.room_number} — ${r.room_type || ""} — PKR ${Number(r.rate_per_night||0).toLocaleString("en-PK")}/night</option>`
    );
  });
}

async function refreshGuests() {
  const current = await listCurrentStays();
  const history = await listGuestHistory();

  // Current
  const cur = current.data || [];
  const curList = $("currentGuestsList");
  curList.innerHTML = "";
  if (!cur.length) {
    curList.innerHTML = `<div class="empty">No guests currently staying. Check in a new guest to get started.</div>`;
  } else {
    cur.forEach(s => {
      const out = new Date(s.expected_checkout_at).toLocaleString("en-PK");
      curList.insertAdjacentHTML("beforeend", `
        <div class="item">
          <div><b>${s.guests?.name || ""}</b> — ${s.guests?.phone || ""}</div>
          <div class="small">Room ${s.rooms?.room_number || ""} — Checkout: ${out}</div>
          <div class="small" data-countdown="${s.expected_checkout_at}">Checkout in ...</div>
        </div>
      `);
    });
  }

  // History (simple list)
  const hist = history.data || [];
  const histList = $("guestHistoryList");
  histList.innerHTML = "";
  if (!hist.length) {
    histList.innerHTML = `<div class="empty">No past guests yet. Guest history will appear here after first checkout.</div>`;
  } else {
    hist.forEach(s => {
      const inAt = new Date(s.checkin_at).toLocaleDateString("en-PK");
      const outAt = s.checkout_at ? new Date(s.checkout_at).toLocaleDateString("en-PK") : "—";
      histList.insertAdjacentHTML("beforeend", `
        <div class="item">
          <div><b>${s.guests?.name || ""}</b> — ${s.guests?.phone || ""}</div>
          <div class="small">Room ${s.rooms?.room_number || ""} | Check-in: ${inAt} | Check-out: ${outAt}</div>
          <div class="small">Advance Paid: ${fmtPKR(s.advance_paid)} | Method: ${s.payment_method}</div>
        </div>
      `);
    });
  }

  updateCountdowns();
}

/* =========================
   Settings
========================= */
async function refreshSettings() {
  const s = await getSettings();
  if (s.error) return;

  $("taxEnabled").value = String(!!s.data.tax_enabled);
  $("taxName").value = s.data.tax_name || "";
  $("taxPct").value = String(s.data.tax_pct ?? 0);
}

/* =========================
   Boot + events
========================= */
async function boot() {
  // notes
  $("quickNotes").value = localStorage.getItem(LS.notes) || "";
  $("quickNotes").addEventListener("input", () => {
    localStorage.setItem(LS.notes, $("quickNotes").value);
  });

  await refreshSettings();
  await refreshRooms();
  await refreshGuests();
  await refreshDashboard();

  // Refresh countdowns every 60s
  setInterval(updateCountdowns, 60000);
}

function wireUI() {
  $("pwBtn").onclick = checkPassword;
  $("pwInput").addEventListener("keydown", (e) => e.key === "Enter" && checkPassword());

  $("themeBtn").onclick = () => {
    const cur = localStorage.getItem(LS.theme) || "light";
    setTheme(cur === "light" ? "dark" : "light");
  };

  document.querySelectorAll(".nav").forEach(b => b.onclick = () => pageNav(b.dataset.page));
  document.querySelectorAll(".bnav").forEach(b => b.onclick = () => pageNav(b.dataset.page));

  document.querySelectorAll(".tab").forEach(t => t.onclick = () => tabNav(t.dataset.tab));

  $("addRoomBtn").onclick = async () => {
    const room = {
      room_number: $("roomNumber").value.trim(),
      floor: Number($("roomFloor").value || 0) || null,
      room_type: $("roomType").value.trim(),
      rate_per_night: Number($("roomRate").value || 0),
      status: $("roomStatus").value
    };
    if (!room.room_number) return ($("roomsMsg").textContent = "Room Number is required.");
    const res = await addRoom(room);
    $("roomsMsg").textContent = res.error ? "Error saving room." : "Room saved.";
    await refreshRooms();
    await refreshDashboard();
  };

  $("checkinBtn").onclick = async () => {
    const payload = {
      name: $("gName").value.trim(),
      phone: $("gPhone").value.trim(),
      room_id: $("gRoom").value,
      expected_checkout_at: $("gCheckout").value,
      advance_paid: Number($("gAdvance").value || 0),
      payment_method: $("gPayMethod").value,
      id_type: $("gIdType").value || null,
      id_number: $("gIdNo").value.trim() || null,
    };
    if (!payload.name || !payload.phone) return ($("guestMsg").textContent = "Guest Name and Phone Number are required.");
    if (!payload.room_id) return ($("guestMsg").textContent = "No available rooms.");
    if (!payload.expected_checkout_at) return ($("guestMsg").textContent = "Expected Checkout Date & Time is required.");

    const res = await checkIn(payload);
    $("guestMsg").textContent = res.error ? "Error checking in guest." : `Guest checked in successfully! Room is now occupied.`;
    await refreshRooms();
    await refreshGuests();
    await refreshDashboard();
    tabNav("current");
  };

  $("saveSettingsBtn").onclick = async () => {
    const payload = {
      tax_enabled: $("taxEnabled").value === "true",
      tax_name: $("taxName").value.trim() || "GST",
      tax_pct: Number($("taxPct").value || 0),
    };
    const res = await saveSettings(payload);
    $("settingsMsg").textContent = res.error ? "Error saving settings." : "Tax settings saved.";
  };
}

(function init() {
  initTheme();
  wireUI();
  initAuth();
})();
