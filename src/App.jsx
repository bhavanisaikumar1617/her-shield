import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Modal from './components/Modal'
import Navbar from './components/Navbar'
import RoleRoute from './components/RoleRoute'
import SOSButton from './components/SOSButton'
import ToastNotifications from './components/ToastNotifications'
import AdminPage from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import AdminProfilePage from './pages/AdminProfilePage'
import AdminEmergencyPage from './pages/AdminEmergencyPage'
import ReportsPage from './pages/ReportsPage'
import SignupPage from './pages/SignupPage'
import UserEmergencyPage from './pages/UserEmergencyPage'
import VolunteerEmergencyPage from './pages/VolunteerEmergencyPage'
import VolunteerProfilePage from './pages/VolunteerProfilePage'
import VolunteerPage from './pages/VolunteerPage'
import VolunteerVerificationPanel from './pages/VolunteerVerificationPanel'

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/dashboard"
              element={
                <RoleRoute role="user">
                  <DashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="/emergency"
              element={
                <RoleRoute role="user">
                  <UserEmergencyPage />
                </RoleRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <RoleRoute role="user">
                  <ProfilePage />
                </RoleRoute>
              }
            />
            <Route
              path="/volunteer"
              element={
                <RoleRoute role="volunteer">
                  <VolunteerPage />
                </RoleRoute>
              }
            />
            <Route
              path="/volunteer/profile"
              element={
                <RoleRoute role="volunteer">
                  <VolunteerProfilePage />
                </RoleRoute>
              }
            />
            <Route
              path="/volunteer/emergency"
              element={
                <RoleRoute role="volunteer">
                  <VolunteerEmergencyPage />
                </RoleRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleRoute role="admin">
                  <AdminPage />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <RoleRoute role="admin">
                  <AdminProfilePage />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/volunteers"
              element={
                <RoleRoute role="admin">
                  <VolunteerVerificationPanel />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/emergency"
              element={
                <RoleRoute role="admin">
                  <AdminEmergencyPage />
                </RoleRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleRoute role="admin">
                  <ReportsPage />
                </RoleRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <ToastNotifications />
      <SOSButton />
      <Modal />
    </div>
  )
}

export default App
