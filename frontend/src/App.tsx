import { Routes, Route } from "react-router-dom";
import Globals from "./Globals";
import CoursePlanning from "@/pages/CoursePlanning/CoursePlanning";
import Dashboard from "@/pages/Dashboard/Dashboard";
import Home from "@/pages/Home/Home";
import Profile from "@/pages/Profile";
import Programs from "@/pages/Programs/Programs";
import Navbar from "@/shared-components/Navbar";
import {
  ProtectedRoute,
  NavigateIfAuthenticatedRoute,
} from "./shared-components/RedirectionRoutes";

function App() {
  return (
    <>
      <Globals>
        <div className="flex flex-col h-screen">
          <Navbar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route
                path="/"
                element={<NavigateIfAuthenticatedRoute element={<Home />} />}
              />
              <Route
                path="/dashboard"
                element={<ProtectedRoute element={<Dashboard />} />}
              />
              <Route
                path="/programs"
                element={<ProtectedRoute element={<Programs />} />}
              />
              <Route
                path="/course-planning"
                element={<ProtectedRoute element={<CoursePlanning />} />}
              />
              <Route
                path="/profile"
                element={<ProtectedRoute element={<Profile />} />}
              />
            </Routes>
          </main>
        </div>
      </Globals>
    </>
  );
}

export default App;
