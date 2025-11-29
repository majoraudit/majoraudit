import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function Home() {
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="h-full min-h-[calc(100vh-5rem)] w-full flex items-center justify-center">
      <div className="m-10 flex w-full max-w-7xl flex-col-reverse items-center gap-10 px-10 py-16 md:flex-row md:gap-10">
        {/* LEFT: Text + Stats + Button */}
        <div className="w-full md:w-1/2 space-y-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Plan Your Major at Yale.
            <span className="block text-brand-blue">Easily.</span>
          </h1>

          <p className="text-lg text-slate-600">
            Auto-audit your requirements, track progress, and plan your journey
            at Yale all in one place.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 text-sm sm:text-base">
            <div className="transition-transform duration-200 hover:scale-[1.08] cursor-default">
              <div className="text-2xl font-semibold sm:text-3xl">80+</div>
              <div className="text-slate-500">majors & certificates</div>
            </div>

            <div className="transition-transform duration-200 hover:scale-[1.08] cursor-default">
              <div className="text-2xl font-semibold sm:text-3xl">1,000+</div>
              <div className="text-slate-500">course & program rules</div>
            </div>

            <div className="transition-transform duration-200 hover:scale-[1.08] cursor-default">
              <div className="text-2xl font-semibold sm:text-3xl">Endless</div>
              <div className="text-slate-500">possibilities to explore</div>
            </div>
          </div>
          <div className="flex flex-initial gap-6">
            <button
              onClick={login}
              className="cursor-pointer inline-flex items-center justify-center rounded-lg bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-1  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              Login with CAS
            </button>

            <button
              onClick={() => navigate("/about")}
              className="cursor-pointer inline-flex items-center justify-center rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-1  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              About Us
            </button>
          </div>
        </div>

        {/* RIGHT: Logo */}
        <div className="w-full md:w-1/2 flex justify-center">
          <img
            src="/logo.svg" // put this in the /public folder
            alt="MajorAudit logo"
            className="max-h-110 w-auto drop-shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}

export default Home;
