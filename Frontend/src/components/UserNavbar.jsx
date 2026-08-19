import React, { useState, useEffect } from 'react'
import { MessagesSquare, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom'
import api from '../Api/Api'

function UserNavbar() {
  const { pathname } = useLocation()
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar'))
  const [displayName, setDisplayName] = useState(localStorage.getItem('display_name'))

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) return
    api.get(`/profile/${userId}`)
      .then(res => {
        if (res.data.success) {
          const p = res.data.profile
          const pic = p.profile_picture || p.avatar_url || p.avatar
          if (pic) {
            setAvatar(pic)
            localStorage.setItem('avatar', pic)
          }
          if (p.display_name) {
            setDisplayName(p.display_name)
            localStorage.setItem('display_name', p.display_name)
          }
        }
      })
      .catch(() => {})
  }, [])

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

      <Link to="/home">
        <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent select-none">
          SyncLab
        </h1>
      </Link>

      {/* <div className="flex gap-8">
        {navLink("/explore", "Explore")}
        {navLink("/collabs", "Collabs")}
      </div> */}

      <div className="flex gap-4 items-center">
        <Link to="/message">
          <button className="px-4 py-1.5 border border-indigo-500/60 rounded-lg
            text-indigo-400 hover:border-indigo-400 hover:text-indigo-300 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]
            transition-all duration-200 flex items-center justify-center">
            <MessagesSquare size={18} />
          </button>
        </Link>

        <Link to="/profile" className="flex items-center gap-2 group">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName || 'Profile'}
              className="w-8 h-8 rounded-full object-cover border-2 border-transparent group-hover:border-indigo-400 transition-all duration-200"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:border-indigo-400 transition-all duration-200">
              <User size={16} />
            </div>
          )}
          {displayName && (
            <span className="text-sm font-medium text-gray-400 group-hover:text-indigo-300 transition-colors duration-200 hidden sm:inline">
              {displayName}
            </span>
          )}
        </Link>
      </div>

    </nav>
  )
}

export default UserNavbar