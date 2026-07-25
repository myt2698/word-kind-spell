import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import SpellPage from './pages/SpellPage'
import ManagePage from './pages/ManagePage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import PwaInstallPrompt from "./components/PwaInstallPrompt"

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/spell" element={<SpellPage />} />
        <Route path="/spell/:mode" element={<SpellPage />} />
        {/* Legacy manage page (redirects to admin) */}
        <Route path="/manage" element={<ManagePage />} />
        {/* Admin dashboard */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PwaInstallPrompt />
    </>
  )
}
