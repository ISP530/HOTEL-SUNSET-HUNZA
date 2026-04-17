/* =========================
   CONFIG (edit ONLY here)
========================= */
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
const APP_PASSWORD = "PASTE_YOUR_PASSWORD_HERE";

/* =========================
   Supabase client
========================= */
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   SQL to run in Supabase
   (Dashboard > SQL Editor)
=========================

create table if not exists settings (
  id int primary key default 1,
  tax_enabled boolean not null default false,
  tax_name text default 'GST',
  tax_pct numeric not null default 0
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null,
  floor int,
  room_type text,
  rate_per_night numeric not null default 0,
  status text not null default 'Available',
  created_at timestamptz default now()
);

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  address text,
  id_type text,
  id_number text,
  created_at timestamptz default now()
);

create table if not exists stays (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete cascade,
  room_id uuid references rooms(id) on delete restrict,
  checkin_at timestamptz not null default now(),
  expected_checkout_at timestamptz not null,
  checkout_at timestamptz,
  advance_paid numeric not null default 0,
  payment_method text not null default 'Cash',
  created_at timestamptz default now()
);

-- Optional: allow public access (simple app)
-- In Supabase: Authentication > Policies
-- Add RLS policies for select/insert/update/delete as needed.

*/

/* =========================
   Small helper: safe query
========================= */
async function safeQuery(fn) {
  try { return await fn(); }
  catch (e) { return { error: e }; }
}

/* =========================
   Settings
========================= */
async function getSettings() {
  const { data, error } = await safeQuery(() =>
    db.from("settings").select("*").eq("id", 1).maybeSingle()
  );
  if (error) return { error };
  if (!data) {
    // create default row
    await db.from("settings").insert({ id: 1, tax_enabled: false, tax_name: "GST", tax_pct: 0 });
    return await getSettings();
  }
  return { data };
}

async function saveSettings(payload) {
  return await safeQuery(() => db.from("settings").update(payload).eq("id", 1));
}

/* =========================
   Rooms
========================= */
async function listRooms() {
  return await safeQuery(() => db.from("rooms").select("*").order("room_number"));
}

async function addRoom(room) {
  return await safeQuery(() => db.from("rooms").insert(room));
}

async function updateRoom(id, patch) {
  return await safeQuery(() => db.from("rooms").update(patch).eq("id", id));
}

/* =========================
   Guests / stays
========================= */
async function getOrCreateGuest({ name, phone, id_type, id_number }) {
  // returning guest by phone
  const existing = await db.from("guests").select("*").eq("phone", phone).maybeSingle();
  if (existing.data) return existing;
  return await db.from("guests").insert({ name, phone, id_type, id_number }).select("*").single();
}

async function checkIn({ name, phone, room_id, expected_checkout_at, advance_paid, payment_method, id_type, id_number }) {
  const g = await getOrCreateGuest({ name, phone, id_type, id_number });
  if (g.error) return { error: g.error };

  // create stay
  const stay = await db.from("stays").insert({
    guest_id: g.data.id,
    room_id,
    expected_checkout_at,
    advance_paid: Number(advance_paid || 0),
    payment_method
  }).select("*").single();

  if (stay.error) return { error: stay.error };

  // mark room occupied
  await updateRoom(room_id, { status: "Occupied" });

  return { data: { guest: g.data, stay: stay.data } };
}

async function listCurrentStays() {
  return await safeQuery(() =>
    db.from("stays")
      .select("*, guests(name,phone), rooms(room_number,room_type)")
      .is("checkout_at", null)
      .order("checkin_at", { ascending: false })
  );
}

async function listGuestHistory() {
  return await safeQuery(() =>
    db.from("stays")
      .select("*, guests(name,phone), rooms(room_number,room_type)")
      .order("checkin_at", { ascending: false })
      .limit(200)
  );
}
