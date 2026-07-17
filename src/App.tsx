import { Routes, Route } from "react-router";
import Home from "@/pages/Home";
import SpellPage from "@/pages/SpellPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/NotFound";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/spelling" element={<SpellPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
