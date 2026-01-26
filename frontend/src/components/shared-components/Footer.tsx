// import sunIcon from "../assets/sun.svg";
import { Link } from "react-router-dom";

function Footer() {
  const linkFormat = (path: string) =>
    location.pathname === path
      ? "text-brand-blue font-medium"
      : "text-gray-700 hover:text-brand-blue transition-colors";

  return (
    <footer className="w-full bg-gray-300 py-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-8 px-4 text-sm text-gray-700">
        <a
          href="https://yalecomputersociety.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:text-brand-blue transition-colors"
        >
          © {new Date().getFullYear()} - A y/cs product
        </a>

        <Link to="/privacy" className={linkFormat("/privacy")}>
          Privacy Policy + Limited Use Agreement
        </Link>
      </div>
    </footer>
  );
}
export default Footer;
