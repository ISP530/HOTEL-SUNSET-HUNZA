
const SUPABASE_URL = 'YOUR_URL'
const SUPABASE_ANON_KEY = 'YOUR_KEY'

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
