// LOGIN
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  const { error } = await login(email, password)

  if (error) {
    document.getElementById('msg').innerText = error.message
  } else {
    startApp()
  }
}

// LOGOUT
document.getElementById('logoutBtn').onclick = async () => {
  await logout()
  location.reload()
}

// START APP
async function startApp() {
  document.getElementById('auth').classList.add('hidden')
  document.getElementById('app').classList.remove('hidden')

  loadRooms()
  loadGuests()
  loadRoomDropdown()
}

// ADD ROOM
document.getElementById('addRoom').onclick = async () => {
  const number = document.getElementById('roomNumber').value
  const rate = document.getElementById('roomRate').value

  if (!number) return alert('Enter room number')

  await addRoom({
    room_number: number,
    rate_per_night: Number(rate) || 0,
    status: 'Available'
  })

  loadRooms()
  loadRoomDropdown()
}

// LOAD ROOMS
async function loadRooms() {
  const rooms = await getRooms()
  const container = document.getElementById('rooms')

  container.innerHTML = ''

  rooms.forEach(r => {
    const div = document.createElement('div')
    div.innerHTML = `
      Room ${r.room_number} - ${r.status}
      <button onclick="deleteRoom('${r.id}')">Delete</button>
      <button onclick="toggleRoom('${r.id}','${r.status}')">Change Status</button>
    `
    container.appendChild(div)
  })
}

// DELETE ROOM
async function deleteRoom(id) {
  await db.from('rooms').delete().eq('id', id)
  loadRooms()
}

// CHANGE STATUS
async function toggleRoom(id, status) {
  const newStatus = status === 'Available' ? 'Blocked' : 'Available'
  await updateRoomStatus(id, newStatus)
  loadRooms()
}

// ROOM DROPDOWN
async function loadRoomDropdown() {
  const rooms = await getRooms()
  const select = document.getElementById('gRoom')

  select.innerHTML = rooms
    .filter(r => r.status === 'Available')
    .map(r => `<option value="${r.id}">${r.room_number}</option>`)
    .join('')
}

// CHECK-IN
document.getElementById('checkin').onclick = async () => {
  const name = document.getElementById('gName').value
  const phone = document.getElementById('gPhone').value
  const roomId = document.getElementById('gRoom').value

  if (!name || !phone || !roomId) {
    return alert('Fill all fields')
  }

  const { data: guest } = await addGuest({
    name,
    phone
  })

  await addStay({
    guest_id: guest.id,
    room_id: roomId,
    guest_name: name,
    room_number: '',
    expected_checkout_at: new Date(Date.now() + 86400000)
  })

  await updateRoomStatus(roomId, 'Occupied')

  loadGuests()
  loadRooms()
  loadRoomDropdown()
}

// LOAD GUESTS
async function loadGuests() {
  const stays = await getCurrentStays()
  const container = document.getElementById('guests')

  container.innerHTML = ''

  stays.forEach(s => {
    const div = document.createElement('div')
    div.innerText = `${s.guest_name} (Room ID: ${s.room_id})`
    container.appendChild(div)
  })
}

// AUTO LOGIN
window.onload = async () => {
  const user = await getUser()
  if (user) startApp()
    }
