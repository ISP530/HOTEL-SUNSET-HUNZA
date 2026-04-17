/* =========================
   CONFIG (EDIT THESE 2 LINES)
========================= */
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

/* =========================
   Supabase client
========================= */
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   Helpers
========================= */
async function getUserOrThrow() {
  const { data, error } = await db.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("Not logged in");
  return data.user;
}

function nowISO() {
  return new Date().toISOString();
}

/* =========================
   AUTH
========================= */
async function signUp(email, password) {
  // If email confirmation is ON, user must verify email before login works.
  return await db.auth.signUp({ email, password });
}

async function signIn(email, password) {
  return await db.auth.signInWithPassword({ email, password });
}

async function signOut() {
  return await db.auth.signOut();
}

async function resetPassword(email) {
  // Supabase will send email if configured.
  return await db.auth.resetPasswordForEmail(email);
}

/* =========================
   SETTINGS
========================= */
async function getSettings() {
  const user = await getUserOrThrow();

  const { data, error } = await db
    .from("settings")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) return { error };

  if (!data) {
    // create default settings row for this owner
    const insert = await db.from("settings").insert({
      owner_id: user.id,
      tax_enabled: false,
      tax_name: "GST",
      tax_pct: 0
    }).select("*").single();

    return insert.error ? { error: insert.error } : { data: insert.data };
  }

  return { data };
}

async function saveSettings(patch) {
  const user = await getUserOrThrow();

  // update existing row if exists, otherwise create one
  const existing = await db
    .from("settings")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing.error) return { error: existing.error };

  if (!existing.data) {
    const created = await db.from("settings").insert({
      owner_id: user.id,
      tax_enabled: !!patch.tax_enabled,
      tax_name: patch.tax_name || "GST",
      tax_pct: Number(patch.tax_pct || 0)
    }).select("*").single();

    return created.error ? { error: created.error } : { data: created.data };
  }

  return await db
    .from("settings")
    .update({
      tax_enabled: !!patch.tax_enabled,
      tax_name: patch.tax_name || "GST",
      tax_pct: Number(patch.tax_pct || 0)
    })
    .eq("owner_id", user.id);
}

/* =========================
   ROOMS
========================= */
async function listRooms() {
  const user = await getUserOrThrow();
  return await db
    .from("rooms")
    .select("*")
    .eq("owner_id", user.id)
    .order("room_number", { ascending: true });
}

async function addRoom(room) {
  const user = await getUserOrThrow();
  return await db.from("rooms").insert({
    owner_id: user.id,
    room_number: String(room.room_number || "").trim(),
    floor: room.floor ?? null,
    room_type: String(room.room_type || "").trim(),
    rate_per_night: Number(room.rate_per_night || 0),
    status: room.status || "Available",
    created_at: nowISO()
  });
}

async function updateRoom(id, patch) {
  const user = await getUserOrThrow();
  return await db
    .from("rooms")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id);
}

/* =========================
   GUESTS + STAYS
   (ID fields optional, no uploads)
========================= */
async function getOrCreateGuest({ name, phone, id_type, id_number }) {
  const user = await getUserOrThrow();

  const existing = await db
    .from("guests")
    .select("*")
    .eq("owner_id", user.id)
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();

  if (existing.data) return existing;

  return await db
    .from("guests")
    .insert({
      owner_id: user.id,
      name,
      phone,
      id_type: id_type || null,
      id_number: id_number || null,
      created_at: nowISO()
    })
    .select("*")
    .single();
}

async function checkIn(payload) {
  const user = await getUserOrThrow();

  const g = await getOrCreateGuest({
    name: payload.name,
    phone: payload.phone,
    id_type: payload.id_type,
    id_number: payload.id_number
  });
  if (g.error) return { error: g.error };

  const stay = await db
    .from("stays")
    .insert({
      owner_id: user.id,
      guest_id: g.data.id,
      room_id: payload.room_id,
      expected_checkout_at: payload.expected_checkout_at,
      advance_paid: Number(payload.advance_paid || 0),
      payment_method: payload.payment_method || "Cash",
      created_at: nowISO()
    })
    .select("*")
    .single();

  if (stay.error) return { error: stay.error };

  // Mark room Occupied
  await updateRoom(payload.room_id, { status: "Occupied" });

  return { data: { guest: g.data, stay: stay.data } };
}

async function listCurrentStays() {
  const user = await getUserOrThrow();
  return await db
    .from("stays")
    .select("*, guests(name,phone), rooms(room_number,room_type)")
    .eq("owner_id", user.id)
    .is("checkout_at", null)
    .order("checkin_at", { ascending: false });
}

async function listGuestHistory(limit = 200) {
  const user = await getUserOrThrow();
  return await db
    .from("stays")
    .select("*, guests(name,phone), rooms(room_number,room_type)")
    .eq("owner_id", user.id)
    .order("checkin_at", { ascending: false })
    .limit(limit);
}
