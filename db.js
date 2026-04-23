const SUPABASE_URL = "https://oaukxhrautnqcrvkprup.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// AUTH
async function login(email, password) {
  return await db.auth.signInWithPassword({ email, password })
}

async function logout() {
  return await db.auth.signOut()
}

async function getUser() {
  const { data } = await db.auth.getUser()
  return data.user
}

// ROOMS
async function getRooms() {
  const user = await getUser()
  const { data } = await db.from("rooms")
    .select("*")
    .eq("owner_id", user.id)
  return data || []
}

async function addRoom(data) {
  const user = await getUser()
  return await db.from("rooms").insert({
    ...data,
    owner_id: user.id
  })
}

async function updateRoom(id, status) {
  return await db.from("rooms")
    .update({ status })
    .eq("id", id)
}

async function deleteRoom(id) {
  return await db.from("rooms").delete().eq("id", id)
}

// GUEST
async function addGuest(data) {
  const user = await getUser()
  return await db.from("guests").insert({
    ...data,
    owner_id: user.id
  }).select().single()
}

// STAY
async function addStay(data) {
  const user = await getUser()
  return await db.from("stays").insert({
    ...data,
    owner_id: user.id
  })
}

async function getActiveStays() {
  const user = await getUser()
  const { data } = await db.from("stays")
    .select("*")
    .eq("owner_id", user.id)
    .is("checkout_at", null)
  return data || []
}

async function checkoutStay(id) {
  return await db.from("stays")
    .update({ checkout_at: new Date() })
    .eq("id", id)
    }

