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
}

// LOAD ROOMS
async function loadRooms() {
  const rooms = await getRooms()
  const container = document.getElementById('rooms')

  container.innerHTML = ''

  rooms.forEach(r => {
    const div = document.createElement('div')
    div.innerText = `Room ${r.room_number} - PKR ${r.rate_per_night}`
    container.appendChild(div)
  })
}

// AUTO LOGIN CHECK
window.onload = async () => {
  const user = await getUser()
  if (user) startApp()
  }
