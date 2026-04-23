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

  const { data: guest } = await addGuest({ name, phone })

  await addStay({
    guest_id: guest.id,
    room_id: room,
    guest_name: name,
    expected_checkout_at: new Date(Date.now() + 86400000)
  })

  await updateRoom(room, "Occupied")

  loadGuests()
  loadRooms()
}

// GUESTS
async function loadGuests() {
  const stays = await getActiveStays()
  const el = document.getElementById("guests")

  el.innerHTML = ""

  stays.forEach(s => {
    el.innerHTML += `
      <div>
        ${s.guest_name}
        <button onclick="checkout('${s.id}')">Checkout</button>
      </div>
    `
  })
}

async function checkout(id) {
  await checkoutStay(id)
  loadGuests()
}

// AUTO LOGIN
window.onload = async () => {
  const user = await getUser()
  if (user) startApp()
    }
