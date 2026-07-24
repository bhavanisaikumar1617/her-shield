import { io } from 'socket.io-client'

const socket = io('https://her-shield-production.up.railway.app', {
  autoConnect: true,
  transports: ['websocket', 'polling'],
})

export default socket
