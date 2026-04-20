/* ============================================
   HOTEL SUNSET — app.js
   Main application logic
   ============================================ */

let currentUser = null
let currentCheckoutStayId = null
let timerInterval = null
let settings = {}

/* ============================================
   INITIALIZATION
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  setupTheme()
  setupAuthTabs()
  setupNavigation()
  setupNotifications()
  checkAuthState()
})

async function checkAuthState() {
  const user = await getUser()
  if (user) {
    currentUser = user
    showApp()
  } else {
    showAuth()
  }

  db.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      currentUser = session.user
      showApp()
    } else {
      currentUser = null
      showAuth()
    }
  })
}

function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden')
  document.getElementById('appShell').classList.add('hidden')
  if (timerInterval) clearInterval(timerInterval)
}

function showApp() {
  document.getElementById('authScreen').classList.add('hidden')
  document.getElementById('appShell').classList.remove('hidden')
  initApp()
}

async function initApp() {
  settings = await getSettings() || {}
  loadDashboard()
  loadNotifications()
  loadQuickNote()
  startTimers()
}

/* ============================================
   AUTH — LOGIN / SIGNUP / LOGOUT
   ============================================ */

document.getElementById('loginForm')
  .addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('loginEmail').value
  const pass = document.getElementById('loginPassword').value
  const msg = document.getElementById('loginMsg')
  msg.textContent = 'Logging in...'
  msg.style.color = '#718096'

  const { error } = await signIn(email, pass)
  if (error) {
    msg.textContent = error.message
    msg.style.color = 'var(--red)'
  } else {
    msg.textContent = ''
  }
})

document.getElementById('signupForm')
  .addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('signupEmail').value
  const pass = document.getElementById('signupPassword').value
  const msg = document.getElementById('signupMsg')
  msg.textContent = 'Creating account...'

  const { error } = await signUp(email, pass)
  if (error) {
    msg.textContent = error.message
    msg.style.color = 'var(--red)'
  } else {
    msg.textContent = 
      'Account created! Please check your email to confirm.'
    msg.style.color = 'var(--green)'
  }
})

document.getElementById('forgotBtn')
  .addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value
  if (!email) {
    document.getElementById('loginMsg').textContent = 
      'Enter your email first'
    return
  }
  const { error } = await resetPassword(email)
  const msg = document.getElementById('loginMsg')
  if (error) {
    msg.textContent = error.message
    msg.style.color = 'var(--red)'
  } else {
    msg.textContent = 'Password reset email sent!'
    msg.style.color = 'var(--green)'
  }
})

document.getElementById('logoutBtn')
  .addEventListener('click', async () => {
  await signOut()
})

/* ============================================
   AUTH TABS (Login / Signup toggle)
   ============================================ */

function setupAuthTabs() {
  document.getElementById('tabLogin').addEventListener('click', () => {
    document.getElementById('loginForm').classList.remove('hidden')
    document.getElementById('signupForm').classList.add('hidden')
    document.getElementById('tabLogin').classList.add('active')
    document.getElementById('tabSignup').classList.remove('active')
  })

  document.getElementById('tabSignup').addEventListener('click', () => {
    document.getElementById('signupForm').classList.remove('hidden')
    document.getElementById('loginForm').classList.add('hidden')
    document.getElementById('tabSignup').classList.add('active')
    document.getElementById('tabLogin').classList.remove('active')
  })
}

/* ============================================
   NAVIGATION
   ============================================ */

function setupNavigation() {
  // Sidebar navigation
  document.querySelectorAll('.nav').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.page)
      // Close sidebar on mobile
      document.getElementById('sidebar').classList.remove('open')
    })
  })

  // Bottom navigation
  document.querySelectorAll('.bnav').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.page)
    })
  })

  // Mobile menu toggle
  document.getElementById('menuToggle')
    .addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open')
  })

  // Tab navigation inside pages
  document.querySelectorAll('.tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('[id^="page-"], .card, section')
      const targetTab = btn.dataset.tab

      // Update tab buttons
      btn.closest('.tabs').querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active')
      })
      btn.classList.add('active')

      // Update tab panes
      document.querySelectorAll(`#tab-${targetTab}`)
        .forEach(pane => {
        // Hide all sibling panes
        const parent = btn.closest('.page') || document.body
        parent.querySelectorAll('.tabpane').forEach(p => {
          p.classList.remove('active')
        })
        pane.classList.add('active')
      })

      // Load content for the tab
      if (targetTab === 'gcurrent') loadCurrentGuests()
      if (targetTab === 'ghistory') loadGuestHistory()
      if (targetTab === 'frevenue') loadFinanceRevenue()
      if (targetTab === 'fexpenses') loadFinanceExpenses()
      if (targetTab === 'fpnl') loadPnL()
      if (targetTab === 'mactive') loadActiveMaintenance()
      if (targetTab === 'mhistory') loadMaintenanceHistory()
      if (targetTab === 'slist') loadStaffList()
      if (targetTab === 'ssalary') loadSalaryTracker()
      if (targetTab === 'shistory') loadSalaryHistory()
    })
  })
}

function navigateTo(page) {
  // Update sidebar
  document.querySelectorAll('.nav').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page)
  })

  // Update bottom nav
  document.querySelectorAll('.bnav').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page)
  })

  // Show correct page
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active')
  })
  const target = document.getElementById(`page-${page}`)
  if (target) target.classList.add('active')

  // Load page data
  if (page === 'dashboard') loadDashboard()
  if (page === 'rooms') loadRooms()
  if (page === 'guests') loadCurrentGuests()
  if (page === 'finance') loadFinanceRevenue()
  if (page === 'billing') loadBilling()
  if (page === 'maintenance') loadActiveMaintenance()
  if (page === 'staff') loadStaffList()
  if (page === 'archive') {
    const now = new Date()
    document.getElementById('archMonth').value = now.getMonth() + 1
    document.getElementById('archYear').value = now.getFullYear()
  }
  if (page === 'settings') loadSettings()
}

/* ============================================
   THEME — DARK / LIGHT MODE
   ============================================ */

function setupTheme() {
  const saved = localStorage.getItem('hs-theme') || 'light'
  applyTheme(saved)

  document.getElementById('themeBtn').addEventListener('click', () => {
    const current = document.body.classList.contains('dark') 
      ? 'dark' : 'light'
    const next = current === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    localStorage.setItem('hs-theme', next)
  })
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark')
    document.getElementById('themeBtn').textContent = '🌙'
  } else {
    document.body.classList.remove('dark')
    document.getElementById('themeBtn').textContent = '☀️'
  }
}

/* ============================================
   HELPERS
   ============================================ */

function fmt(amount) {
  const currency = settings?.currency || 'PKR'
  return `${currency} ${Number(amount || 0).toLocaleString()}`
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function fmtDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function timeDiff(targetDate) {
  const now = new Date()
  const target = new Date(targetDate)
  const diff = target - now
  if (diff <= 0) return { text: 'OVERDUE', cls: 'timer-red', overdue: true }

  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)

  if (h > 24) {
    const d = Math.floor(h / 24)
    return { text: `${d}d ${h % 24}h remaining`, cls: 'timer-green', overdue: false }
  } else if (h > 2) {
    return { text: `${h}h ${m}m remaining`, cls: 'timer-amber', overdue: false }
  } else {
    return { text: `${h}h ${m}m remaining`, cls: 'timer-red', overdue: false }
  }
}

function nightsBetween(checkin, checkout) {
  const a = new Date(checkin)
  const b = new Date(checkout)
  const diff = Math.max(1, Math.round((b - a) / 86400000))
  return diff
}

function setMsg(id, text, isError = false) {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = text
  el.style.color = isError ? 'var(--red)' : 'var(--green)'
}

/* ============================================
   TIMERS — Update every 60 seconds
   ============================================ */

function startTimers() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    refreshTimers()
    checkAlerts()
  }, 60000)
}

function refreshTimers() {
  document.querySelectorAll('[data-checkout]').forEach(el => {
    const checkout = el.dataset.checkout
    const { text, cls } = timeDiff(checkout)
    el.textContent = text
    el.className = `countdown-badge ${cls}`
  })
}

/* ============================================
   DASHBOARD
   ============================================ */

async function loadDashboard() {
  const [rooms, stays, todayRevenue, todayExpenses] = await Promise.all([
    getRooms(),
    getCurrentStays(),
    getRevenueByDateRange(
      new Date().toISOString().split('T')[0],
      new Date(Date.now() + 86400000).toISOString().split('T')[0]
    ),
    getExpensesByDateRange(
      new Date().toISOString().split('T')[0],
      new Date(Date.now() + 86400000).toISOString().split('T')[0]
    )
  ])

  // Room counters
  const avail = rooms.filter(r => r.status === 'Available').length
  const occ = rooms.filter(r => r.status === 'Occupied').length
  const clean = rooms.filter(r => r.status === 'Cleaning').length
  const maint = rooms.filter(r => r.status === 'Maintenance').length

  document.getElementById('dAvail').textContent = avail
  document.getElementById('dOcc').textContent = occ
  document.getElementById('dClean').textContent = clean
  document.getElementById('dMaint').textContent = maint

  // Occupancy meter
  const total = rooms.length
  const pct = total > 0 ? Math.round((occ / total) * 100) : 0
  document.getElementById('occPct').textContent = `${pct}%`
  document.getElementById('occFill').style.width = `${pct}%`
  document.getElementById('occLine').textContent = 
    `Occupied: ${occ} / Total: ${total}`
  document.getElementById('occText').textContent = 
    total === 0 ? 'No rooms configured yet' : 
    `${pct}% of rooms are occupied`

  // Today financials
  const todayRev = todayRevenue.reduce((s, r) => s + Number(r.amount), 0)
  const todayExp = todayExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const todayProfit = todayRev - todayExp

  document.getElementById('dRevenue').textContent = fmt(todayRev)
  document.getElementById('dExpenses').textContent = fmt(todayExp)

  const profitEl = document.getElementById('dProfit')
  profitEl.textContent = fmt(Math.abs(todayProfit))
  profitEl.className = `v ${todayProfit >= 0 ? 'green' : 'red'}`

  // Pending payments
  const pendingAmt = stays.reduce((s, st) => {
    const nights = nightsBetween(st.checkin_at, st.expected_checkout_at)
    const total = (nights * st.rate_per_night) - st.advance_paid
    return s + Math.max(0, total)
  }, 0)
  document.getElementById('dPending').textContent = fmt(pendingAmt)

  // P&L overview
  await loadDashboardPnL()

  // Rooms becoming available today
  const todayStr = new Date().toISOString().split('T')[0]
  const todayCheckouts = stays.filter(st => {
    const coDate = new Date(st.expected_checkout_at)
      .toISOString().split('T')[0]
    return coDate === todayStr
  })

  const availList = document.getElementById('availTodayList')
  if (todayCheckouts.length === 0) {
    availList.innerHTML = 
      '<div class="empty">No checkouts scheduled for today</div>'
  } else {
    availList.innerHTML = todayCheckouts.map(st => {
      const { text, cls } = timeDiff(st.expected_checkout_at)
      return `<div class="item">
        <div>
          <strong>${st.guest_name}</strong> — Room ${st.room_number}
          <div class="small">Expected checkout: 
            ${fmtDateTime(st.expected_checkout_at)}</div>
        </div>
        <span class="countdown-badge ${cls}" 
              data-checkout="${st.expected_checkout_at}">
          ${text}
        </span>
      </div>`
    }).join('')
  }

  // Alerts
  checkAlerts(stays, rooms)
}

async function loadDashboardPnL() {
  const r = getDateRange

  const [dRev, dExp, wRev, wExp, mRev, mExp, yRev, yExp] = 
    await Promise.all([
    getRevenueByDateRange(r('today').start, r('today').end),
    getExpensesByDateRange(r('today').start, r('today').end),
    getRevenueByDateRange(r('week').start, r('week').end),
    getExpensesByDateRange(r('week').start, r('week').end),
    getRevenueByDateRange(r('month').start, r('month').end),
    getExpensesByDateRange(r('month').start, r('month').end),
    getRevenueByDateRange(r('year').start, r('year').end),
    getExpensesByDateRange(r('year').start, r('year').end)
  ])

  const sum = arr => arr.reduce((s, i) => s + Number(i.amount), 0)

  const daily = sum(dRev) - sum(dExp)
  const weekly = sum(wRev) - sum(wExp)
  const monthly = sum(mRev) - sum(mExp)
  const yearly = sum(yRev) - sum(yExp)

  const setPnl = (id, val) => {
    const el = document.getElementById(id)
    if (!el) return
    el.textContent = fmt(Math.abs(val))
    el.className = `v ${val >= 0 ? 'green' : 'red'}`
  }

  setPnl('pnlDaily', daily)
  setPnl('pnlWeekly', weekly)
  setPnl('pnlMonthly', monthly)
  setPnl('pnlYearly', yearly)
}

function resetPnl(period) {
  const map = {
    daily: 'pnlDaily',
    weekly: 'pnlWeekly',
    monthly: 'pnlMonthly',
    yearly: 'pnlYearly'
  }
  const el = document.getElementById(map[period])
  if (el) {
    el.textContent = fmt(0)
    el.className = 'v green'
  }
}

async function checkAlerts(stays, rooms) {
  if (!stays) stays = await getCurrentStays()
  if (!rooms) rooms = await getRooms()

  const alerts = []
  const now = new Date()

  // Overstay alerts
  stays.forEach(st => {
    const checkout = new Date(st.expected_checkout_at)
    if (now > checkout) {
      const hoursOver = Math.round((now - checkout) / 3600000)
      alerts.push({
        type: 'alert',
        msg: `⚠️ OVERSTAY: ${st.guest_name} in Room ${st.room_number} — 
          ${hoursOver}h overdue`
      })
    }
  })

  // Maintenance rooms alert
  const maintRooms = rooms.filter(r => r.status === 'Maintenance')
  if (maintRooms.length > 0) {
    alerts.push({
      type: 'alert',
      msg: `🔧 ${maintRooms.length} room(s) under maintenance: 
        ${maintRooms.map(r => r.room_number).join(', ')}`
    })
  }

  const alertsList = document.getElementById('alertsList')
  if (alerts.length === 0) {
    alertsList.innerHTML = 
      '<div class="item ok">✅ No active alerts — everything is on track!</div>'
  } else {
    alertsList.innerHTML = alerts.map(a =>
      `<div class="item ${a.type}">${a.msg}</div>`
    ).join('')
  }
}

/* ============================================
   QUICK NOTES
   ============================================ */

async function loadQuickNote() {
  const note = await getQuickNote()
  if (note) {
    document.getElementById('quickNotes').value = note.note_text || ''
  }
}

document.getElementById('saveNoteBtn')
  .addEventListener('click', async () => {
  const text = document.getElementById('quickNotes').value
  await saveQuickNote(text)
  setMsg('roomMsg', '')
})

/* ============================================
   ROOMS
   ============================================ */

document.getElementById('addRoomBtn').addEventListener('click', async () => {
  const number = document.getElementById('rNumber').value.trim()
  const floor = document.getElementById('rFloor').value
  const type = document.getElementById('rType').value.trim()
  const rate = document.getElementById('rRate').value
  const status = document.getElementById('rStatus').value
  const notes = document.getElementById('rNotes').value.trim()

  if (!number) {
    setMsg('roomMsg', 'Room number is required', true)
    return
  }

  const { error } = await addRoom({
    room_number: number,
    floor: floor ? parseInt(floor) : null,
    room_type_name: type || 'Standard',
    rate_per_night: parseFloat(rate) || 0,
    status,
    notes
  })

  if (error) {
    setMsg('roomMsg', error.message, true)
  } else {
    setMsg('roomMsg', `Room ${number} added successfully!`)
    document.getElementById('rNumber').value = ''
    document.getElementById('rFloor').value = ''
    document.getElementById('rType').value = ''
    document.getElementById('rRate').value = ''
    document.getElementById('rNotes').value = ''
    loadRooms()
  }
})

document.getElementById('roomSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase()
  document.querySelectorAll('.room-card').forEach(card => {
    const text = card.textContent.toLowerCase()
    card.style.display = text.includes(q) ? '' : 'none'
  })
})

async function loadRooms() {
  const rooms = await getRooms()
  const container = document.getElementById('roomsList')

  if (rooms.length === 0) {
    container.innerHTML = '<div class="empty">No rooms added yet</div>'
    return
  }

  container.innerHTML = rooms.map(r => {
    const statusColors = {
      Available: 'green', Occupied: 'red',
      Cleaning: 'amber', Maintenance: 'blue', Blocked: 'grey'
    }
    const cls = statusColors[r.status] || 'grey'
    return `<div class="room-card ${r.status}" 
                 onclick="quickStatusChange('${r.id}','${r.status}')">
      <div class="room-num">🛏 ${r.room_number}</div>
      <div class="room-type">${r.room_type_name || 'Standard'}</div>
      <div class="room-rate">${fmt(r.rate_per_night)}/night</div>
      <span class="badge ${cls} room-status-badge">${r.status}</span>
      ${r.notes ? `<div class="small" style="margin-top:4px">
        📝 ${r.notes}</div>` : ''}
      <div class="item-actions" style="margin-top:8px;justify-content:center">
        <button class="btn-sm btn-amber" 
          onclick="event.stopPropagation();changeRoomStatus('${r.id}')">
          Status
        </button>
        <button class="btn-sm btn-red" 
          onclick="event.stopPropagation();deleteRoomConfirm('${r.id}','${r.room_number}')">
          Delete
        </button>
      </div>
    </div>`
  }).join('')
}

async function changeRoomStatus(id) {
  const statuses = ['Available','Occupied','Cleaning','Maintenance','Blocked']
  const rooms = await getRooms()
  const room = rooms.find(r => r.id === id)
  if (!room) return

  const current = room.status
  c
