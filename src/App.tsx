import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import TagsPage from './pages/TagsPage'
import GroupsPage from './pages/GroupsPage'
import SearchPage from './pages/SearchPage'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tags" element={<TagsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
