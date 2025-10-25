import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Search from './pages/Search'
import SignupRole from './pages/SignupRole'
import SignupPassenger from './pages/SignupPassenger'
import SignupDriver from './pages/SignupDriver'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import PassengerDashboard from './pages/PassengerDashboard'
import DriverDashboard from './pages/DriverDashboard'
import TripDetail from './pages/TripDetail'
import Chat from './pages/Chat'
import UniCard from './pages/UniCard'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'

const AppContent = () => {
  const location = useLocation()
  
  // Don't show footer on search page
  const showFooter = location.pathname !== '/search'
  
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="/search" element={<Search />} />
          <Route path="/signup" element={<SignupRole />} />
          <Route path="/signup/passenger" element={<SignupPassenger />} />
          <Route path="/signup/driver" element={<SignupDriver />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/trip/:id" element={<TripDetail />} />
          <Route
            path="/dashboard/passenger"
            element={
              <ProtectedRoute role="passenger">
                <PassengerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/driver"
            element={
              <ProtectedRoute role="driver">
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:userId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/conversation/:conversationId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unicard"
            element={
              <ProtectedRoute>
                <UniCard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Routes>
      </main>
      {showFooter && <Footer />}
    </div>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App