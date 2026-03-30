import { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/authContext.jsx'
import Loader from './components/Loader.jsx'
import { SkeletonLogin } from './components/skeletons/SkeletonLogin.jsx'

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

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
    <div className="text-center">
      <div className="skeleton-logo-wrapper mb-6" style={{ width: 80, height: 80, margin: '0 auto' }}>
        <div className="skeleton-logo-glow"></div>
        <div className="skeleton-logo animate-pulse"></div>
      </div>
      <div className="h-4 w-48 mx-auto skeleton-animate rounded"></div>
      <style>{`
        .skeleton-logo-wrapper {
          position: relative;
        }
        .skeleton-logo-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          animation: glow-pulse 2s ease-in-out infinite;
        }
        .skeleton-logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 50%;
        }
        .skeleton-animate {
          background: linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
        }
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  </div>
)

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const { loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authLoading])

  if (isLoading) {
    return <Loader onComplete={() => setIsLoading(false)} />
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<PageLoader />}>
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
