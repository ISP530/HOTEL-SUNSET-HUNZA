/* ============================================
   HOTEL SUNSET — db.js
   ============================================
   EDIT THESE TWO LINES ONLY:
   ============================================ */

const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'

/* ============================================
   DO NOT EDIT BELOW THIS LINE
   ============================================ */

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ============================================
   AUTH HELPERS
   ============================================ */

async function getUser() {
  const { data } = await db.auth.getUser()
  return data?.user || null
}

async function getUserId() {
  const user = await getUser()
  return user?.id || null
}

async function signIn(email, password) {
  return await db.auth.signInWithPassword({ email, password })
}

async function signUp(email, password) {
  return await db.auth.signUp({ email, password })
}

async function signOut() {
  return await db.auth.signOut()
}

async function resetPassword(email) {
  return await db.auth.resetPasswordForEmail(email)
}

/* ============================================
   SETTINGS
   ============================================ */

async function getSettings() {
  const uid = await getUserId()
  const { data } = await db
    .from('settings')
    .select('*')
    .eq('owner_id', uid)
    .single()
  return data
}

async function saveSettings(payload) {
  const uid = await getUserId()
  const existing = await getSettings()
  if (existing) {
    return await db
      .from('settings')
      .update(payload)
      .eq('owner_id', uid)
  } else {
    return await db
      .from('settings')
      .insert({ ...payload, owner_id: uid })
  }
}

/* ============================================
   ROOMS
   ============================================ */

async function getRooms() {
  const uid = await getUserId()
  const { data } = await db
    .from('rooms')
    .select('*')
    .eq('owner_id', uid)
    .order('room_number', { ascending: true })
  return data || []
}

async function addRoom(payload) {
  const uid = await getUserId()
  return await db
    .from('rooms')
    .insert({ ...payload, owner_id: uid })
}

async function updateRoom(id, payload) {
  return await db
    .from('rooms')
    .update(payload)
    .eq('id', id)
}

async function deleteRoom(id) {
  return await db
    .from('rooms')
    .delete()
    .eq('id', id)
}

async function getAvailableRooms() {
  const uid = await getUserId()
  const { data } = await db
    .from('rooms')
    .select('*')
    .eq('owner_id', uid)
    .eq('status', 'Available')
    .order('room_number', { ascending: true })
  return data || []
}

/* ============================================
   GUESTS
   ============================================ */

async function getGuests() {
  const uid = await getUserId()
  const { data } = await db
    .from('guests')
    .select('*')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false })
  return data || []
}

async function findGuestByPhone(phone) {
  const uid = await getUserId()
  const { data } = await db
    .from('guests')
    .select('*')
    .eq('owner_id', uid)
    .eq('phone', phone)
    .single()
  return data
}

async function addGuest(payload) {
  const uid = await getUserId()
  return await db
    .from('guests')
    .insert({ ...payload, owner_id: uid })
    .select()
    .single()
}

async function updateGuest(id, payload) {
  return await db
    .from('guests')
    .update(payload)
    .eq('id', id)
}

/* ============================================
   STAYS
   ============================================ */

async function getCurrentStays() {
  const uid = await getUserId()
  const { data } = await db
    .from('stays')
    .select('*')
    .eq('owner_id', uid)
    .is('checkout_at', null)
    .order('checkin_at', { ascending: false })
  return data || []
}

async function getAllStays() {
  const uid = await getUserId()
  const { data } = await db
    .from('stays')
    .select('*')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false })
  return data || []
}

async function addStay(payload) {
  const uid = await getUserId()
  return await db
    .from('stays')
    .insert({ ...payload, owner_id: uid })
    .select()
    .single()
}

async function checkoutStay(id, payload) {
  return await db
    .from('stays')
    .update({ ...payload, checkout_at: new Date().toISOString() })
    .eq('id', id)
}

async function getStaysByDateRange(startDate, endDate) {
  const uid = await getUserId()
  const { data } = await db
    .from('stays')
    .select('*')
    .eq('owner_id', uid)
    .gte('checkin_at', startDate)
    .lte('checkin_at', endDate)
    .order('checkin_at', { ascending: false })
  return data || []
}

/* ============================================
   REVENUE
   ============================================ */

async function getRevenue() {
  const uid = await getUserId()
  const { data } = await db
    .from('revenue')
    .select('*')
    .eq('owner_id', uid)
    .order('revenue_date', { ascending: false })
  return data || []
}

async function addRevenue(payload) {
  const uid = await getUserId()
  return await db
    .from('revenue')
    .insert({ ...payload, owner_id: uid })
}

async function deleteRevenue(id) {
  return await db
    .from('revenue')
    .delete()
    .eq('id', id)
}

async function getRevenueByDateRange(startDate, endDate) {
  const uid = await getUserId()
  const { data } = await db
    .from('revenue')
    .select('*')
    .eq('owner_id', uid)
    .gte('revenue_date', startDate)
    .lte('revenue_date', endDate)
  return data || []
}

/* ============================================
   EXPENSES
   ============================================ */

async function getExpenses() {
  const uid = await getUserId()
  const { data } = await db
    .from('expenses')
    .select('*')
    .eq('owner_id', uid)
    .order('expense_date', { ascending: false })
  return data || []
}

async function addExpense(payload) {
  const uid = await getUserId()
  return await db
    .from('expenses')
    .insert({ ...payload, owner_id: uid })
}

async function deleteExpense(id) {
  return await db
    .from('expenses')
    .delete()
    .eq('id', id)
}

async function getExpensesByDateRange(startDate, endDate) {
  const uid = await getUserId()
  const { data } = await db
    .from('expenses')
    .select('*')
    .eq('owner_id', uid)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
  return data || []
}

/* ============================================
   MAINTENANCE
   ============================================ */

async function getMaintenance() {
  const uid = await getUserId()
  const { data } = await db
    .from('maintenance')
    .select('*')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false })
  return data || []
}

async function getActiveMaintenance() {
  const uid = await getUserId()
  const { data } = await db
    .from('maintenance')
    .select('*')
    .eq('owner_id', uid)
    .neq('status', 'Resolved')
    .order('created_at', { ascending: false })
  return data || []
}

async function addMaintenance(payload) {
  const uid = await getUserId()
  return await db
    .from('maintenance')
    .insert({ ...payload, owner_id: uid })
}

async function updateMaintenance(id, payload) {
  return await db
    .from('maintenance')
    .update(payload)
    .eq('id', id)
}

async function getMaintenanceByDateRange(startDate, endDate) {
  const uid = await getUserId()
  const { data } = await db
    .from('maintenance')
    .select('*')
    .eq('owner_id', uid)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
  return data || []
}

/* ============================================
   STAFF
   ============================================ */

async function getStaff() {
  const uid = await getUserId()
  const { data } = await db
    .from('staff')
    .select('*')
    .eq('owner_id', uid)
    .eq('is_active', true)
    .order('full_name', { ascending: true })
  return data || []
}

async function addStaff(payload) {
  const uid = await getUserId()
  return await db
    .from('staff')
    .insert({ ...payload, owner_id: uid })
}

async function updateStaff(id, payload) {
  return await db
    .from('staff')
    .update(payload)
    .eq('id', id)
}

/* ============================================
   SALARY PAYMENTS
   ============================================ */

async function getSalaryPayments() {
  const uid = await getUserId()
  const { data } = await db
    .from('salary_payments')
    .select('*')
    .eq('owner_id', uid)
    .order('payment_date', { ascending: false })
  return data || []
}

async function addSalaryPayment(payload) {
  const uid = await getUserId()
  return await db
    .from('salary_payments')
    .insert({ ...payload, owner_id: uid })
}

async function getSalaryByDateRange(startDate, endDate) {
  const uid = await getUserId()
  const { data } = await db
    .from('salary_payments')
    .select('*')
    .eq('owner_id', uid)
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)
  return data || []
}

/* ============================================
   NOTIFICATIONS
   ============================================ */

async function getNotifications() {
  const uid = await getUserId()
  const { data } = await db
    .from('notifications')
    .select('*')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false })
    .limit(30)
  return data || []
}

async function addNotification(message, type = 'info') {
  const uid = await getUserId()
  return await db
    .from('notifications')
    .insert({ owner_id: uid, message, type })
}

async function markAllNotificationsRead() {
  const uid = await getUserId()
  return await db
    .from('notifications')
    .update({ is_read: true })
    .eq('owner_id', uid)
}

/* ============================================
   QUICK NOTES
   ============================================ */

async function getQuickNote() {
  const uid = await getUserId()
  const { data } = await db
    .from('quick_notes')
    .select('*')
    .eq('owner_id', uid)
    .single()
  return data
}

async function saveQuickNote(text) {
  const uid = await getUserId()
  const existing = await getQuickNote()
  if (existing) {
    return await db
      .from('quick_notes')
      .update({ note_text: text, updated_at: new Date().toISOString() })
      .eq('owner_id', uid)
  } else {
    return await db
      .from('quick_notes')
      .insert({ owner_id: uid, note_text: text })
  }
}

/* ============================================
   EXTRA CHARGES
   ============================================ */

async function getExtraCharges(stayId) {
  const { data } = await db
    .from('extra_charges')
    .select('*')
    .eq('stay_id', stayId)
  return data || []
}

async function addExtraCharge(payload) {
  const uid = await getUserId()
  return await db
    .from('extra_charges')
    .insert({ ...payload, owner_id: uid })
}

/* ============================================
   ARCHIVE / DATE HELPERS
   ============================================ */

function getDateRange(period) {
  const now = new Date()
  let start, end

  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    end = new Date(start)
    end.setDate(end.getDate() + 1)
  } else if (period === 'week') {
    start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    end = new Date(now)
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear() + 1, 0, 1)
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

async function getArchiveData(month, year) {
  const uid = await getUserId()
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDate = `${endYear}-${String(endMonth).padStart(2,'0')}-01`

  const [stays, expenses, maintenance, salary] = await Promise.all([
    getStaysByDateRange(startDate, endDate),
    getExpensesByDateRange(startDate, endDate),
    getMaintenanceByDateRange(startDate, endDate),
    getSalaryByDateRange(startDate, endDate)
  ])

  const revenue = await getRevenueByDateRange(startDate, endDate)

  return { stays, expenses, maintenance, salary, revenue }
}
