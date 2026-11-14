import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PublicLanding } from '../features/landing/PublicLanding'
import { LoginPage } from '../features/auth/LoginPage'
import { AppShell } from './layouts/AppShell'
import { featureRoutes } from './navigation'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLanding />} />
        <Route path="/login" element={<LoginPage />} />
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
