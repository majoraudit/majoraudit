import { Routes, Route } from "react-router-dom";
import Globals from "./Globals";
import CoursePlanning from "@/pages/CoursePlanning/CoursePlanning";
import Dashboard from "@/pages/Dashboard/Dashboard";
import Home from "@/pages/Home/Home";
import Profile from "@/pages/Profile/Profile";
import Onboarding from "@/pages/Onboarding/Onboarding";
import Programs from "@/pages/Programs/Programs";
import About from "@/pages/About/About";
import PrivacyTerms from "./pages/PrivacyTerms/PrivacyTerms";
import Navbar from "@/components/shared-components/Navbar";
import Footer from "@/components/shared-components/Footer";
import {
  ProtectedRoute,
  NavigateIfAuthenticatedRoute,
  OnboardingRoute,
} from "./components/shared-components/RedirectionRoutes";

function App() {
  return (
    <>
      <Globals>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 min-h-0 flex flex-col">
            <Routes>
              <Route
                path="/"
                element={<NavigateIfAuthenticatedRoute element={<Home />} />}
              />
              <Route
                path="/onboarding"
                element={<OnboardingRoute element={<Onboarding />} />}
              />
              <Route
                path="/dashboard"
                element={<ProtectedRoute element={<Dashboard />} />}
              />
              <Route path="/programs" element={<Programs />} />
              <Route
                path="/course-planning"
                element={<ProtectedRoute element={<CoursePlanning />} />}
              />
              <Route
                path="/profile"
                element={<ProtectedRoute element={<Profile />} />}
              />
              <Route path="/about" element={<About />} />
              <Route path="/privacy-terms" element={<PrivacyTerms />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Globals>
    </>
  );
}

export default App;
