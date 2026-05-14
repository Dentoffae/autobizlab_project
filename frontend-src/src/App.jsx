import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Enquire from './pages/Enquire'
import Privacy from './pages/Privacy'
import PageSkeleton from './components/PageSkeleton'
import ErrorBoundary from './components/ErrorBoundary'

const Admin = lazy(() => import('./pages/Admin'))
const Login = lazy(() => import('./pages/Login'))

function LegacyEnquireRedirect() {
  const { search, hash } = useLocation()
  return <Navigate to={`/ru/enquire${search}${hash}`} replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ErrorBoundary>
        <Routes>
        <Route path="/en/admin/login" element={<Login />} />
        <Route path="/en/admin" element={<Admin />} />
        <Route path="/ru/admin/login" element={<Login />} />
        <Route path="/ru/admin" element={<Admin />} />

        <Route path="/admin/login" element={<Navigate to="/ru/admin/login" replace />} />
        <Route path="/admin" element={<Navigate to="/ru/admin" replace />} />

        <Route path="/ru" element={<Landing />} />
        <Route path="/ru/" element={<Landing />} />
        <Route path="/ru/enquire" element={<Enquire />} />
        <Route path="/ru/enquire/" element={<Enquire />} />
        <Route path="/ru/privacy" element={<Privacy />} />
        <Route path="/ru/privacy/" element={<Privacy />} />

        <Route path="/en" element={<Landing />} />
        <Route path="/en/" element={<Landing />} />
        <Route path="/en/enquire" element={<Enquire />} />
        <Route path="/en/enquire/" element={<Enquire />} />
        <Route path="/en/privacy" element={<Privacy />} />
        <Route path="/en/privacy/" element={<Privacy />} />

        <Route path="/" element={<Navigate to="/ru" replace />} />
        <Route path="/privacy" element={<Navigate to="/ru/privacy" replace />} />
        <Route path="/enquire" element={<LegacyEnquireRedirect />} />

        <Route path="*" element={<Navigate to="/ru" replace />} />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  )
}
