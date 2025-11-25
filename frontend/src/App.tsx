import { Routes, Route } from "react-router-dom";
import Globals from "./Globals";
import CoursePlanning from "@/pages/CoursePlanning/CoursePlanning";
import Dashboard from "@/pages/Dashboard/Dashboard";
import Home from "@/pages/Home/Home";
import Profile from "@/pages/Profile/Profile";
import Programs from "@/pages/Programs/Programs";
import About from "@/pages/About/About";
import Navbar from "@/components/shared-components/Navbar";
import Footer from "@/components/shared-components/Footer";
import {
  ProtectedRoute,
  NavigateIfAuthenticatedRoute,
} from "./components/shared-components/RedirectionRoutes";

function App() {
  return (
    <>
      <Globals>
        <div className="flex flex-col h-screen">
          <Navbar />
          <main className="flex-1">
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
              <Route
                path="/about"
                element={<ProtectedRoute element={<About />} />}
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Globals>
    </>
  );
}

export default App;
