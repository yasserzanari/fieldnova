import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { featureRoutes } from './navigation'

const PublicLanding = lazy(() => import('../features/landing/PublicLanding').then(module => ({ default: module.PublicLanding })))
const LoginPage = lazy(() => import('../features/auth/LoginPage').then(module => ({ default: module.LoginPage })))
const DemoEntryPage = lazy(() => import('../features/demo/DemoEntryPage').then(module => ({ default: module.DemoEntryPage })))

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Suspense fallback={<RouteLoading />}><PublicLanding /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<RouteLoading />}><LoginPage /></Suspense>} />
        <Route path="/demo" element={<Suspense fallback={<RouteLoading />}><DemoEntryPage /></Suspense>} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="overview" replace />} />
          {featureRoutes.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RouteLoading() {
  return <div className="route-loading" role="status">Ouverture de la vue…</div>
}
