// import sunIcon from "../assets/sun.svg";

function Footer() {
  return (
    <footer className="w-full bg-gray-300 py-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-5 px-4 text-sm text-gray-700">
        <p className="font-bold">
          © {new Date().getFullYear()} - A y/cs product
        </p>
        <p>Privacy Policy + Limited Use Agreement</p>
      </div>
    </footer>
  );
}
export default Footer;
