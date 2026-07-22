import { Link, useLocation } from "react-router-dom"

function Navbar() {
  const { pathname } = useLocation()

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`relative text-sm font-medium transition-colors duration-200 pb-0.5
        ${pathname === to
          ? "text-indigo-400 after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-indigo-400"
          : "text-gray-400 hover:text-indigo-300"
        }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4
      bg-black/80 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40">

      <Link to="/">
        <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent select-none">
          SyncLab
        </h1>
      </Link>

      <div className="flex gap-8">
        {navLink("/explore", "Explore")}
        {navLink("/collabs", "Collabs")}
      </div>

      <div className="flex gap-3">
        <Link to="/login">
          <button className="px-4 py-1.5 text-sm font-medium border border-indigo-500/60 rounded-lg
            text-indigo-400 hover:border-indigo-400 hover:text-indigo-300 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]
            transition-all duration-200">
            Login
          </button>
        </Link>

        <Link to="/signup">
          <button className="px-4 py-1.5 text-sm font-semibold rounded-lg
            bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_16px_rgba(99,102,241,0.45)]
            transition-all duration-200">
            Sign Up
          </button>
        </Link>
      </div>

    </nav>
  )
}

export default Navbar