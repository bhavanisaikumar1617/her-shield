# HerShield – Women Safety & Emergency Assistance Platform

HerShield is a full-stack MERN web application built to provide fast, reliable, and real-time emergency support for women. The platform enables users to trigger SOS alerts, share live location, and connect instantly with nearby verified volunteers and administrators for rapid response.

The goal is simple: reduce emergency response time, improve coordination, and create a safer digital safety network.

## 🚨 Core Features

### 👩 User Features
- One-tap SOS trigger for emergency alerts
- Live location sharing during active incidents
- Real-time alert status tracking
- Emergency history and incident visibility

### 🙋 Volunteer Features
- Receive nearby emergency requests in real time
- Accept or reject SOS requests
- View user incident locations on map
- Track assigned alerts and update action flow

### 🛡️ Admin Features
- Central dashboard with emergency activity stats
- Live map view with alert pins and status markers
- Volunteer verification (approve/reject workflow)
- End-to-end alert monitoring and coordination

## ✨ Key Highlights

- Real-time SOS alert broadcasting with Socket.io
- Interactive map-based tracking using Leaflet
- Secure authentication and role-based access control
- Responsive UI optimized for desktop and mobile

## 🔧 Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- React Router
- Leaflet / React-Leaflet

### Backend
- Node.js
- Express.js
- Socket.io

### Database
- MongoDB Atlas

## 🗂️ Project Structure

```text
her-shield/
├── server/
│   ├── models/
│   ├── utils/
│   ├── index.js
│   └── .env
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   ├── App.jsx
│   └── main.jsx
├── public/
├── package.json
└── README.md
```

## 🔐 Environment Variables

Create `server/.env` and configure:

```env
MONGO_URI=
JWT_SECRET=
PORT=4000
FRONTEND_URL=https://her-shield-mu.vercel.app
```

## 🚀 Run Locally

```bash
npm install
npm run dev
```

`npm run dev` starts both frontend and backend together in one command.

## 🔄 Demo Flow

1. User signs in and triggers SOS.
2. User live location is attached to the alert.
3. Nearby volunteers receive the request in real time.
4. Volunteer accepts request and navigates to user location.
5. Admin monitors alert lifecycle and volunteer actions.
6. Emergency is resolved and status is marked completed.

## 📈 Future Enhancements

- Native mobile app (Android/iOS)
- Advanced voice-activated SOS
- AI-based safety risk prediction
- Police and emergency service integration

## 👨‍💻 Author

**Bhavani Sai Kumar**

GitHub: https://github.com/bhavanisaikumar1617
