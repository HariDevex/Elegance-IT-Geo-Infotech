import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/authContext.jsx'

const Login = lazy(() => import('./pages/Login'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'))
const RootDashboard = lazy(() => import('./pages/RootDashboard'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/login" replace />

  return children
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{backgroundColor: '#0f172a'}}><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>}>
      <Routes>
        <Route path='/' element={<Navigate to="/login" />} />
        <Route path='/login' element={<Login />} />

        <Route
          path='/root-dashboard'
          element={
            <ProtectedRoute allowedRoles={['root']}>
              <RootDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin-dashboard'
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'hr', 'teamlead']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path='/employee-dashboard'
          element={
            <ProtectedRoute allowedRoles={['developer']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        <Route path='/change-password' element={<ChangePassword />} />
        <Route path='/Forgot-Password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
