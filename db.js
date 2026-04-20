/* ================================================
   HOTEL SUNSET — db.js
   CHANGE ONLY THESE 2 LINES:
================================================ */
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
/* ================================================
   DO NOT CHANGE ANYTHING BELOW THIS LINE
================================================ */

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* --- helpers --- */
async function getUser() {
  const { data } = await db.auth.getUser();
  return data?.user || null;
}
function nowISO() { return new Date().toISOString(); }
function todayStr() { return new Date().toISOString().split("T")[0]; }

function dateRange(timeline, fromStr, toStr) {
  const now = new Date();
  let from, to;
  if (timeline === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (timeline === "week") {
    const day = now.getDay();
    from = new Date(now); from.setDate(now.getDate() - day); from.setHours(0,0,0,0);
    to = new Date(from); to.setDate(from.getDate() + 6); to.setHours(23,59,59,999);
  } else if (timeline === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (timeline === "year") {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (timeline === "alltime") {
    from = new Date("2000-01-01");
    to = new Date("2099-12-31");
  } else if (timeline === "custom") {
    from = new Date(fromStr + "T00:00:00");
    to = new Date(toStr + "T23:59:59");
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

/* --- AUTH --- */
async function signUp(email, password) { return await db.auth.signUp({ email, password }); }
async function signIn(email, password) { return await db.auth.signInWithPassword({ email, password }); }
async function signOut() { return await db.auth.signOut(); }
async function resetPassword(email) { return await db.auth.resetPasswordForEmail(email); }

/* --- SETTINGS --- */
async function getSettings() {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  const { data, error } = await db.from("settings").select("*").eq("owner_id", user.id).maybeSingle();
  if (error) return { error };
  if (!data) {
    const ins = await db.from("settings").insert({ owner_id: user.id }).select("*").single();
    return ins.error ? { error: ins.error } : { data: ins.data };
  }
  return { data };
}
async function saveSettings(patch) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  const existing = await db.from("settings").select("id").eq("owner_id", user.id).maybeSingle();
  if (!existing.data) return await db.from("settings").insert({ owner_id: user.id, ...patch });
  return await db.from("settings").update(patch).eq("owner_id", user.id);
}

/* --- ROOMS --- */
async function listRooms() {
  const user = await getUser(); if (!user) return { data: [] };
  return await db.from("rooms").select("*").eq("owner_id", user.id).order("room_number");
}
async function addRoom(room) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  return await db.from("rooms").insert({ owner_id: user.id, ...room });
}
async function updateRoom(id, patch) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  return await db.from("rooms").update(patch).eq("id", id).eq("owner_id", user.id);
}

/* --- GUESTS --- */
async function getOrCreateGuest(payload) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  const ex = await db.from("guests").select("*").eq("owner_id", user.id).eq("phone", payload.phone).maybeSingle();
  if (ex.data) return { data: ex.data, returning: true };
  const ins = await db.from("guests").insert({ owner_id: user.id, ...payload }).select("*").single();
  return ins.error ? { error: ins.error } : { data: ins.data, returning: false };
}
async function listCurrentStays() {
  const user = await getUser(); if (!user) return { data: [] };
  return await db.from("stays").select("*, guests(name,phone), rooms(room_number,room_type_name)").eq("owner_id", user.id).is("checkout_at", null).order("checkin_at", { ascending: false });
}
async function listGuestHistory() {
  const user = await getUser(); if (!user) return { data: [] };
  return await db.from("stays").select("*, guests(name,phone), rooms(room_number,room_type_name)").eq("owner_id", user.id).order("checkin_at", { ascending: false }).limit(300);
}
async function checkIn(payload) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  const g = await getOrCreateGuest({ name: payload.name, phone: payload.phone, id_type: payload.id_type || null, id_number: payload.id_number || null });
  if (g.error) return { error: g.error };
  const stay = await db.from("stays").insert({
    owner_id: user.id,
    guest_id: g.data.id,
    room_id: payload.room_id,
    room_number: payload.room_number,
    room_type: payload.room_type,
    guest_name: payload.name,
    guest_phone: payload.phone,
    rate_per_night: Number(payload.rate_per_night || 0),
    expected_checkout_at: payload.expected_checkout_at,
    advance_paid: Number(payload.advance_paid || 0),
    payment_method: payload.payment_method || "Cash",
    num_adults: Number(payload.num_adults || 1),
    num_children: Number(payload.num_children || 0),
    guest_type: payload.guest_type || null
  }).select("*").single();
  if (stay.error) return { error: stay.error };
  await updateRoom(payload.room_id, { status: "Occupied" });
  return { data: { guest: g.data, stay: stay.data }, returning: g.returning };
}

/* --- REVENUE --- */
async function addRevenue(entry) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  return await db.from("revenue").insert({ owner_id: user.id, ...entry });
}
async function listRevenue(timeline, from, to) {
  const user = await getUser(); if (!user) return { data: [] };
  const r = dateRange(timeline, from, to);
  return await db.from("revenue").select("*").eq("owner_id", user.id).gte("created_at", r.from).lte("created_at", r.to).order("created_at", { ascending: false });
}
async function sumRevenue(timeline) {
  const user = await getUser(); if (!user) return 0;
  const r = dateRange(timeline, null, null);
  const { data } = await db.from("revenue").select("amount").eq("owner_id", user.id).gte("created_at", r.from).lte("created_at", r.to);
  return (data || []).reduce((s, row) => s + Number(row.amount || 0), 0);
}

/* --- EXPENSES --- */
async function addExpense(entry) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  return await db.from("expenses").insert({ owner_id: user.id, ...entry });
}
async function listExpenses(timeline, from, to) {
  const user = await getUser(); if (!user) return { data: [] };
  const r = dateRange(timeline, from, to);
  return await db.from("expenses").select("*").eq("owner_id", user.id).gte("created_at", r.from).lte("created_at", r.to).order("created_at", { ascending: false });
}
async function sumExpenses(timeline) {
  const user = await getUser(); if (!user) return 0;
  const r = dateRange(timeline, null, null);
  const { data } = await db.from("expenses").select("amount").eq("owner_id", user.id).gte("created_at", r.from).lte("created_at", r.to);
  return (data || []).reduce((s, row) => s + Number(row.amount || 0), 0);
}

/* --- MAINTENANCE --- */
async function addMaintenance(entry) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  return await db.from("maintenance").insert({ owner_id: user.id, ...entry });
}
async function listMaintenance(statusFilter) {
  const user = await getUser(); if (!user) return { data: [] };
  let q = db.from("maintenance").select("*").eq("owner_id", user.id);
  if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
  return await q.order("created_at", { ascending: false });
}
async function updateMaintenance(id, patch) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  return await db.from("maintenance").update(patch).eq("id", id).eq("owner_id", user.id);
}

/* --- STAFF --- */
async function addStaff(member) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  return await db.from("staff").insert({ owner_id: user.id, ...member });
}
async function listStaff() {
  const user = await getUser(); if (!user) return { data: [] };
  return await db.from("staff").select("*").eq("owner_id", user.id).eq("is_active", true).order("full_name");
}

/* --- EXPORT (download to device) --- */
async function exportData(type, timeline, fromStr, toStr, format) {
  const user = await getUser(); if (!user) return { error: "not logged in" };
  const r = dateRange(timeline, fromStr, toStr);
  let rows = [];

  const tables = type === "full"
    ? ["guests", "stays", "revenue", "expenses", "maintenance", "salary_payments", "payments"]
    : [type];

  if (type === "full") {
    let allData = {};
    for (const t of tables) {
      const { data } = await db.from(t).select("*").eq("owner_id", user.id).gte("created_at", r.from).lte("created_at", r.to);
      allData[t] = data || [];
    }
    downloadFile(
      `HOTEL_SUNSET_Full_Backup_${todayStr()}.${format}`,
      format === "json" ? JSON.stringify(allData, null, 2) : "Full backup requires JSON format",
      format === "json" ? "application/json" : "text/plain"
    );
    return { success: true };
  }

  const { data } = await db.from(type).select("*").eq("owner_id", user.id).gte("created_at", r.from).lte("created_at", r.to);
  rows = data || [];

  if (!rows.length) return { empty: true };

  const label = `HOTEL_SUNSET_${type}_${timeline}_${todayStr()}`;
  if (format === "json") {
    downloadFile(`${label}.json`, JSON.stringify(rows, null, 2), "application/json");
  } else {
    downloadFile(`${label}.csv`, toCSV(rows), "text/csv");
  }
  return { success: true };
}

function toCSV(arr) {
  if (!arr.length) return "";
  const keys = Object.keys(arr[0]);
  const header = keys.join(",");
  const rows = arr.map(row => keys.map(k => {
    const val = row[k] === null || row[k] === undefined ? "" : String(row[k]);
    return `"${val.replace(/"/g, '""')}"`;
  }).join(","));
  return [header, ...rows].join("\n");
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
