import React from 'react'
import { MessagesSquare } from 'lucide-react';
import { Link } from 'react-router-dom'
function UserNavbar() {
    return (
    <nav className="flex items-center justify-between px-8 py-4 bg-black border-b border-blue-500/30 backdrop-blur">

      <h1 className="text-xl font-bold text-blue-400">
        <Link to="/home">
        SyncLab
        </Link>
      </h1>

      <div className="flex gap-10 text-gray-300">

    

        <Link to="/explore" className="hover:text-blue-400 transition">
          Explore
        </Link>

        <Link to="/collabs" className="hover:text-blue-400 transition">
          Collabs
        </Link>

      </div>

      <div className="flex gap-4">

        <Link to="/message">
          <button className="px-4 py-2 border border-blue-500 rounded-lg text-blue-400 hover:bg-blue-500 hover:text-black transition">
            <MessagesSquare />
          </button>
        </Link>

        {/* <Link to="/signup">
          <button className="px-4 py-2 bg-blue-500 text-black rounded-lg hover:bg-blue-600 transition">
            Signup
          </button>
        </Link> */}

      </div>

    </nav>
  )
}

export default UserNavbar