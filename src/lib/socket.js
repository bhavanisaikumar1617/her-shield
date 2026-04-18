import { io } from 'socket.io-client'

const socket = io('http://localhost:4000', {
  autoConnect: true,
  transports: ['websocket', 'polling'],
})

export default socket
