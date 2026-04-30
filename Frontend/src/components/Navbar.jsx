import { Link } from "react-router-dom"

function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-black border-b border-blue-500/30 backdrop-blur">

      <h1 className="text-xl font-bold text-blue-400">
        SyncLab
      </h1>

      <div className="flex gap-10 text-gray-300">

        {/* <Link to="/" className="hover:text-blue-400 transition">
          Home
        </Link> */}

        <Link to="/explore" className="hover:text-blue-400 transition">
          Explore
        </Link>

        <Link to="/collabs" className="hover:text-blue-400 transition">
          Collabs
        </Link>

      </div>

      <div className="flex gap-4">

        <Link to="/login">
          <button className="px-4 py-2 border border-blue-500 rounded-lg text-blue-400 hover:bg-blue-500 hover:text-black transition">
            Login
          </button>
        </Link>

        <Link to="/signup">
          <button className="px-4 py-2 bg-blue-500 text-black rounded-lg hover:bg-blue-600 transition">
            Signup
          </button>
        </Link>

      </div>

    </nav>
  )
}

export default Navbar