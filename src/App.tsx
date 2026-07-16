import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import SpellPage from './pages/SpellPage'
import ManagePage from './pages/ManagePage'
import ProfilePage from './pages/ProfilePage'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/spell" element={<SpellPage />} />
      <Route path="/spell/:mode" element={<SpellPage />} />
      <Route path="/manage" element={<ManagePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
