async function handleLogin() {
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  const { error } = await login(email, password)

  if (error) {
    document.getElementById("msg").innerText = error.message
  } else {
    startApp()
  }
}

async function handleLogout() {
  await logout()
  location.reload()
}

async function startApp() {
  document.getElementById("auth").style.display = "none"
  document.getElementById("app").style.display = "block"

  loadRooms()
  loadGuests()
  loadRoomDropdown()
}

// ROOMS UI
async function addRoomUI() {
  const no = document.getElementById("roomNo").value
  const rate = document.getElementById("roomRate").value

  await addRoom({
    room_number: no,
    rate_per_night: rate,
    status: "Available"
  })

  loadRooms()
}

async function loadRooms() {
  const rooms = await getRooms()
  const el = document.getElementById("rooms")
  el.innerHTML = ""

  rooms.forEach(r => {
    el.innerHTML += `
      <div>
        Room ${r.room_number} (${r.status})
        <button onclick="deleteRoom('${r.id}')">X</button>
        <button onclick="toggle('${r.id}','${r.status}')">Toggle</button>
      </div>
    `
  })
}

async function toggle(id, status) {
  const newStatus = status === "Available" ? "Blocked" : "Available"
  await updateRoom(id, newStatus)
  loadRooms()
}

// DROPDOWN
async function loadRoomDropdown() {
  const rooms = await getRooms()
  const el = document.getElementById("gRoom")

  el.innerHTML = rooms
    .filter(r => r.status === "Available")
    .map(r => `<option value="${r.id}">${r.room_number}</option>`)
    .join("")
}

// CHECKIN
async function checkin() {
  const name = document.getElementById("gName").value
  const phone = document.getElementById("gPhone").value
  const room = document.getElementById("gRoom").value
  const days = Number(document.getElementById("gDays").value || 1)

  const rooms = await getRooms()
  const selectedRoom = rooms.find(r => r.id === room)

  const { data: guest } = await addGuest({ name, phone })

  const total = days * (selectedRoom.rate_per_night || 0)

  await addStay({
    guest_id: guest.id,
    room_id: room,
    guest_name: name,
    rate_per_night: selectedRoom.rate_per_night,
    expected_checkout_at: new Date(Date.now() + days * 86400000),
    total_amount: total
  })

  await updateRoom(room, "Occupied")

  loadGuests()
  loadRooms()
  loadDashboard()
}

// Checkout 
async function checkout(id) {
  const stays = await getActiveStays()
  const stay = stays.find(s => s.id === id)

  const now = new Date()
  const checkout = new Date(stay.expected_checkout_at)

  const days = Math.ceil((checkout - new Date(stay.created_at)) / 86400000)
  const total = days * stay.rate_per_night

  await addRevenue(total)

  await checkoutStay(id)
  await updateRoom(stay.room_id, "Available")

  alert("Bill: PKR " + total)

  loadGuests()
  loadRooms()
  loadDashboard()
}

// GUESTS
async function loadGuests() {
  const stays = await getActiveStays()
  const el = document.getElementById("guests")

  el.innerHTML = ""

  stays.forEach(s => {
    const remaining = Math.max(0,
      Math.floor((new Date(s.expected_checkout_at) - new Date()) / 3600000)
    )

    el.innerHTML += `
      <div>
        ${s.guest_name} | ${remaining}h left
        <button onclick="checkout('${s.id}')">Checkout</button>
      </div>
    `
  })
}

// AUTO LOGIN
window.onload = async () => {
  const user = await getUser()
  if (user) startApp()
    }

// DASHBOARD
async function loadDashboard() {
  const rooms = await getRooms()
  const guests = await getActiveStays()
  const revenue = await getRevenueTotal()

  document.getElementById("statRooms").innerText = rooms.length
  document.getElementById("statGuests").innerText = guests.length
  document.getElementById("statRevenue").innerText = revenue
                                   }
