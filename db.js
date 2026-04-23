
const SUPABASE_URL = 'https://oaukxhrautnqcrvkprup.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hdWt4aHJhdXRucWNydmtwcnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTc1OTgsImV4cCI6MjA5MTc5MzU5OH0.3QnJbuhjlkLX3zykmf6kJcC_U_pv2RJeJNlveD5tAFE'

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
async function addRoom(room) {
  const user = await getUser()
  return await db.from('rooms').insert({
    ...room,
    owner_id: user.id
  })
}

async function getRooms() {
  const user = await getUser()
  const { data } = await db
    .from('rooms')
    .select('*')
    .eq('owner_id', user.id)

  return data || []
}
// GUESTS
async function addGuest(payload) {
  const user = await getUser()
  return await db.from('guests').insert({
    ...payload,
    owner_id: user.id
  }).select().single()
}

// STAYS
async function addStay(payload) {
  const user = await getUser()
  return await db.from('stays').insert({
    ...payload,
    owner_id: user.id
  })
}

async function getCurrentStays() {
  const user = await getUser()
  const { data } = await db
    .from('stays')
    .select('*')
    .eq('owner_id', user.id)
    .is('checkout_at', null)

  return data || []
}

async function updateRoomStatus(id, status) {
  return await db.from('rooms')
    .update({ status })
    .eq('id', id)
  }
