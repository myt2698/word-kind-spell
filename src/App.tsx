import { lazy, Suspense } from "react"
import { Routes, Route } from 'react-router'
import PwaInstallPrompt from "./components/PwaInstallPrompt"

const Home = lazy(() => import("./pages/Home"))
const SpellPage = lazy(() => import("./pages/SpellPage"))
const ManagePage = lazy(() => import("./pages/ManagePage"))
const AdminPage = lazy(() => import("./pages/AdminPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const PhonicsPage = lazy(() => import("./pages/PhonicsPage"))
const Login = lazy(() => import("./pages/Login"))
const NotFound = lazy(() => import("./pages/NotFound"))
const RestMode = lazy(() => import("./components/RestMode"))

export default function App() {
  const isLocalPreview = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
  return (
    <>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">加载中…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Home searchMode />} />
          <Route path="/spell" element={<SpellPage />} />
          <Route path="/spell/:mode" element={<SpellPage />} />
          <Route path="/phonics" element={<PhonicsPage />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<Login />} />
          {isLocalPreview && (
            <Route
              path="/rest-preview"
              element={(
                <div
                  className="mx-auto min-h-[844px] w-[390px] max-w-full bg-white"
                >
                  <RestMode onBack={() => window.history.back()} />
                </div>
              )}
            />
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <PwaInstallPrompt />
    </>
  )
}
